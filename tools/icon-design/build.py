"""Draw small, editable vector icons, then overlay real font glyphs and export RGBA PNGs.

Requires Pillow. Does not modify game data or install candidates as active icons.
Design instructions are read verbatim from statuses.ts / relics.ts into the manifest.
"""
from __future__ import annotations

import argparse
import html
import json
import math
import re
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageColor

ROOT = Path(__file__).resolve().parents[2]
SCALE = 8
BEZIER_STEPS = 24
JP_FONT = Path('C:/Windows/Fonts/NotoSansJP-VF.ttf')
LATIN_FONT = Path('C:/Windows/Fonts/bahnschrift.ttf')


def rgba(color):
    if isinstance(color, tuple):
        return color
    return ImageColor.getcolor(color, 'RGBA')


def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(rgba(a), rgba(b)))


@lru_cache(maxsize=256)
def font(size, latin=False, weight=750):
    path = LATIN_FONT if latin else JP_FONT
    result = ImageFont.truetype(str(path), max(1, round(size * SCALE)))
    if not latin:
        result.set_variation_by_axes([weight])
    return result


class Art:
    """32-unit vector space, independent of exported icon dimensions."""
    def __init__(self, variant=0):
        self.variant = variant
        self.image = Image.new('RGBA', (32 * SCALE, 32 * SCALE))
        self.text_layer = Image.new('RGBA', self.image.size)
        self.ops = []
        self.labels = []

    def polygon(self, points, fill, outline=None, width=1):
        points = [(float(x), float(y)) for x, y in points]
        layer = Image.new('RGBA', self.image.size)
        d = ImageDraw.Draw(layer)
        coords = [(round(x*SCALE), round(y*SCALE)) for x, y in points]
        d.polygon(coords, fill=rgba(fill))
        if outline:
            d.line(coords + [coords[0]], fill=rgba(outline), width=max(1, round(width*SCALE)), joint='curve')
        self.image.alpha_composite(layer)
        self.ops.append(('polygon', points, fill, outline, width))

    def path(self, commands, fill, outline=None, width=1):
        """M/L/C/Q/Z subset; Beziers are sampled for Pillow and retained as SVG paths."""
        words = re.findall(r'[MLCQZ]|-?\d+(?:\.\d+)?', commands)
        points = []
        i = 0
        p = (0, 0)
        while i < len(words):
            command = words[i]; i += 1
            if command == 'Z':
                continue
            count = {'M': 2, 'L': 2, 'C': 6, 'Q': 4}[command]
            values = list(map(float, words[i:i+count])); i += count
            if command in ('M', 'L'):
                p = tuple(values); points.append(p)
            else:
                start = p
                for step in range(1, BEZIER_STEPS + 1):
                    t = step / BEZIER_STEPS; u = 1-t
                    if command == 'C':
                        x1,y1,x2,y2,x3,y3 = values
                        p = (u**3*start[0]+3*u*u*t*x1+3*u*t*t*x2+t**3*x3,
                             u**3*start[1]+3*u*u*t*y1+3*u*t*t*y2+t**3*y3)
                    else:
                        x1,y1,x2,y2 = values
                        p = (u*u*start[0]+2*u*t*x1+t*t*x2, u*u*start[1]+2*u*t*y1+t*t*y2)
                    points.append(p)
        self.polygon(points, fill, outline, width)
        self.ops[-1] = ('path', commands, fill, outline, width)

    def ellipse(self, box, fill, outline=None, width=1):
        layer = Image.new('RGBA', self.image.size)
        ImageDraw.Draw(layer).ellipse(tuple(round(v*SCALE) for v in box), fill=rgba(fill),
            outline=rgba(outline) if outline else None, width=max(1, round(width*SCALE)))
        self.image.alpha_composite(layer)
        self.ops.append(('ellipse', box, fill, outline, width))

    def roundrect(self, box, radius, fill, outline=None, width=1):
        layer = Image.new('RGBA', self.image.size)
        ImageDraw.Draw(layer).rounded_rectangle(tuple(round(v*SCALE) for v in box), radius=round(radius*SCALE),
            fill=rgba(fill), outline=rgba(outline) if outline else None, width=max(1, round(width*SCALE)))
        self.image.alpha_composite(layer)
        self.ops.append(('rect', (box, radius), fill, outline, width))

    def line(self, points, color, width=1):
        layer = Image.new('RGBA', self.image.size)
        d = ImageDraw.Draw(layer)
        coords = [(round(x*SCALE), round(y*SCALE)) for x,y in points]
        w = max(1, round(width*SCALE))
        d.line(coords, fill=rgba(color), width=w, joint='curve')
        r = w/2
        for x,y in [coords[0], coords[-1]]:
            d.ellipse((round(x-r), round(y-r), round(x+r), round(y+r)), fill=rgba(color))
        self.image.alpha_composite(layer)
        self.ops.append(('line', points, color, None, width))

    def text(self, text, center, size, color, *, latin=False, stroke=None, stroke_width=.55, max_width=28):
        face = font(size, latin)
        bbox = face.getbbox(text)
        if bbox[2]-bbox[0] > max_width*SCALE:
            size *= max_width*SCALE / (bbox[2]-bbox[0])
            face = font(size, latin); bbox = face.getbbox(text)
        x = center[0]*SCALE-(bbox[2]+bbox[0])/2
        y = center[1]*SCALE-(bbox[3]+bbox[1])/2
        d = ImageDraw.Draw(self.text_layer)
        d.text((round(x), round(y)), text, font=face, fill=rgba(color),
            stroke_width=round(stroke_width*SCALE) if stroke else 0, stroke_fill=rgba(stroke) if stroke else None)
        self.labels.append(dict(text=text, center=center, size=size, color=color, font='Bahnschrift' if latin else 'Noto Sans JP',
                                weight=750 if not latin else 'Regular', stroke=stroke))

    def gradient(self, top, bottom, strength=1):
        """Gradient is clipped to existing artwork alpha; it cannot create a square background."""
        overlay = Image.new('RGBA', self.image.size)
        d = ImageDraw.Draw(overlay)
        for y in range(overlay.height):
            d.line((0,y,overlay.width,y), fill=mix(top,bottom,y/(overlay.height-1)))
        overlay.putalpha(self.image.getchannel('A'))
        self.image = Image.blend(self.image, overlay, strength)

    def save(self, directory, size):
        directory.mkdir(parents=True, exist_ok=True)
        for filename, layer in [('artwork.png', self.image), ('lettering.png', self.text_layer)]:
            layer.resize((size,size),Image.Resampling.LANCZOS).save(directory/filename)
        out = Image.alpha_composite(self.image,self.text_layer).resize((size,size),Image.Resampling.LANCZOS)
        out.save(directory/'icon.png', optimize=True)
        (directory/'lettering.json').write_text(json.dumps(self.labels,ensure_ascii=False,indent=2),encoding='utf-8')
        # Editable vector geometry, with no generated/drawn letter shapes.
        svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">']
        for kind, geometry, fill, outline, width in self.ops:
            def color_attrs(name, value):
                r,g,b,a = rgba(value)
                return f'{name}="rgb({r},{g},{b})" {name}-opacity="{a/255:.4f}"'
            style = color_attrs('fill', fill) if kind != 'line' else 'fill="none"'
            if outline: style += ' ' + color_attrs('stroke',outline) + f' stroke-width="{width}" stroke-linejoin="round"'
            if kind == 'path': svg.append(f'<path d="{geometry}" {style}/>')
            elif kind == 'polygon': svg.append(f'<polygon points="'+ ' '.join(f'{x},{y}' for x,y in geometry)+f'" {style}/>')
            elif kind == 'ellipse':
                x1,y1,x2,y2=geometry; svg.append(f'<ellipse cx="{(x1+x2)/2}" cy="{(y1+y2)/2}" rx="{(x2-x1)/2}" ry="{(y2-y1)/2}" {style}/>')
            elif kind == 'rect':
                (x1,y1,x2,y2),r=geometry; svg.append(f'<rect x="{x1}" y="{y1}" width="{x2-x1}" height="{y2-y1}" rx="{r}" {style}/>')
            else: svg.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in geometry)+'" fill="none" '+color_attrs('stroke',fill)+f' stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>')
        svg.append('</svg>')
        (directory/'artwork.svg').write_text('\n'.join(svg),encoding='utf-8')
        return out


def heart(a, cx, cy, scale, color, edge='#5d2045', variant=0):
    # Hearts use a small asymmetry, rather than rotated tiny letterforms.
    pts=[]
    for i in range(100):
        t = math.pi*2*i/100
        x=16*math.sin(t)**3
        y=13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t)
        pts.append((cx+x*scale/32,cy-(y+2.5)*scale/32))
    a.polygon(pts,color,edge,.85)
    if variant==0 and scale>9:
        a.line([(cx-scale*.25,cy-scale*.12),(cx-scale*.16,cy-scale*.21)],'#ffffffaa',.85)


def tremble(a, color, strength=1, variant=0):
    shift=variant*.5
    a.line([(3.5,8+shift),(2,11),(3.5,14),(2,17+shift)],color,.85*strength)
    a.line([(28.5,10),(30,13+shift),(28.8,16),(30,20)],color,.85*strength)
    if strength>1:
        a.line([(5,22),(3.5,24),(4.8,27)],color,.8)
        a.line([(27,5),(28.8,6),(27.8,8)],color,.8)


def tile(a, text, level, shade=0):
    v=a.variant
    colors=['#d673a4','#c2538b','#ad3977','#962764','#7c1d56']
    fill=colors[shade]
    radius=[4,7,3][v]
    a.roundrect((2,2,30,30),radius,fill,'#642044',1)
    if v==0:
        a.line([(6,3.5),(24,3.5)],'#f3a8cc',.6)
    elif v==1:
        a.roundrect((3.5,3.5,28.5,28.5),5,'#ffffff00','#f4b3d055',.7)
    else:
        a.polygon([(3,21),(29,13),(29,27),(26,29),(6,29),(3,26)],'#7c1c542b')
    a.text(text,(16,13 if v!=1 else 13.5),14.3,'#fff0fa',max_width=27)
    tag='Lv'+str(level)
    width=15 if level=='MAX' else 13
    if v!=2:
        a.roundrect((30-width,22,30,30),2,'#642044','#ed9cc1',.5)
    a.text(tag,(30-width/2,26),7.8,'#fff3fb',latin=True,stroke='#63223f',stroke_width=.25,max_width=width-1)


def stomach(a, letter, ink):
    v=a.variant
    paths=[
      'M 14 2 L 19 2 L 19 8 C 19 11 21 7 25 10 C 31 15 28 24 22 28 C 17 31 11 28 9 24 C 8 22 6 23 4 26 L 2 23 C 5 19 9 17 13 20 C 18 22 18 17 15 15 C 12 12 14 7 14 2 Z',
      'M 12 2 L 17 2 L 17 8 C 21 4 28 8 29 16 C 30 24 25 29 18 29 C 12 29 12 24 8 24 L 4 29 L 2 25 C 5 17 10 16 14 19 C 18 22 21 17 16 15 C 12 13 12 9 12 2 Z',
      'M 13 2 L 18 2 L 18 9 C 23 5 28 9 29 16 C 30 22 26 28 19 29 C 13 29 11 22 8 25 L 5 29 L 2 27 C 5 19 8 17 13 20 C 18 23 20 17 16 14 C 12 12 13 7 13 2 Z']
    a.path(paths[v],['#ffd5e0','#f9bbcd','#ffe4eb'][v],'#bb748f',.9)
    if v==0: a.line([(23,11),(25,15)],'#ffffffb0',1.2)
    a.text(letter,(20,19),17,ink,max_width=20,stroke='#ffedf2',stroke_width=.4)


def face(a, dizzy=False):
    v=a.variant
    a.ellipse((2,2,30,30),['#fff0c8','#ffe6a9','#f9eacc'][v],'#5d4c66',1)
    if not dizzy:
        # Blue fade clipped to the face, without tinting its outline or eyes.
        layer=Image.new('RGBA',a.image.size); d=ImageDraw.Draw(layer)
        for y in range(3*SCALE,18*SCALE):
            alpha=round(170*(1-(y-3*SCALE)/(15*SCALE)))
            d.line((4*SCALE,y,28*SCALE,y),fill=(71,137,192,alpha))
        mask=Image.new('L',a.image.size); ImageDraw.Draw(mask).ellipse((3*SCALE,3*SCALE,29*SCALE,29*SCALE),fill=255)
        layer.putalpha(Image.composite(layer.getchannel('A'),Image.new('L',layer.size),mask)); a.image.alpha_composite(layer)
    for cx in [10,22]:
        if dizzy:
            pts=[]
            for i in range(65):
                t=i/64*math.pi*(3.5+v*.3); r=.15+i/64*3.6
                pts.append((cx+math.cos(t)*r,13+math.sin(t)*r))
            a.line(pts,'#4f3565',1.2)
        else:
            a.line([(cx-2.5,10),(cx+2.5,15)],'#354466',1.5)
            a.line([(cx+2.5,10),(cx-2.5,15)],'#354466',1.5)
    a.line([(10,23),(13,21.5),(16,23.5),(19,21.5),(22,23)],'#61526b',1.1)
    if v==1: a.ellipse((25,19,28,23),'#78bde8','#426a97',.5)
    if v==2:
        a.line([(3,6),(1.5,4)],'#758dc0',.8)
        a.line([(28,4),(30,2.5)],'#758dc0',.8)


def portal(a, letter, part):
    v=a.variant
    a.ellipse((2,2,20,14),['#ee8ab5','#f6afcb','#f29abb'][v],'#8d3a68',.7)
    a.ellipse((4,4,18,12),'#a02f6e','#ffcadf',.55)
    # Letter is composed from a font. Only its top-left corner is occluded by the lip.
    a.text(letter,(17,17),23,'#29212d' if letter=='侵' else '#fff6fc',stroke='#d16d9d' if letter=='挿' else '#f7b6d1',stroke_width=.7,max_width=24)
    lip=Image.new('RGBA',a.image.size)
    dl=ImageDraw.Draw(lip)
    dl.arc((2*SCALE,2*SCALE,20*SCALE,14*SCALE),40,138,fill='#f6b2cf',width=round(2*SCALE))
    a.text_layer.alpha_composite(lip)
    a.roundrect((21,21,30,30),2,'#672f52','#ffcee2',.6)
    a.text(part,(25.5,25.5),9.5,'#fff4fc',latin=True,max_width=8)
    if v==1: a.line([(23,3),(25,6),(28,5)],'#ec7baa',1)
    if v==2: a.line([(4,20),(2,23),(4,26)],'#c56496',1)


def infestation(a, part, pink):
    v=a.variant
    color=('#ef89bf' if pink else '#8cdbf8')
    edge=('#7d2f66' if pink else '#245574')
    tremble(a,color,1+.15*v,v)
    if v==1:
        a.text('寄生',(15.3,14.4),13.8,edge,stroke=edge,stroke_width=.4,max_width=26)
    a.text('寄生',(16,15),13.8,color,stroke=edge,stroke_width=.75,max_width=26)
    a.text(part,(26,26.2),9.5,color,latin=True,stroke=edge,stroke_width=.6,max_width=9)
    if v==2: a.line([(7,24),(10,22.8),(13,24),(16,22.8)],color,.75)


def heart_cluster(a, n):
    v=a.variant
    color={2:'#e5416c',3:'#8c294a',4:'#29212e'}[n]
    edge={2:'#6b2149',3:'#421b34',4:'#ad668e'}[n]
    layouts=[[(11,10,13),(21,15,16),(11,23,12),(22,24,10)],
             [(21,9,12),(12,17,18),(23,24,12),(8,25,10)],
             [(10,12,14),(22,10,12),(20,22,18),(8,24,10)]]
    for x,y,s in layouts[v][:n]: heart(a,x,y,s,color,edge,v)
    tremble(a,'#dc829f' if n==4 else color,1 if n==2 else 1.3,v)


def rope_line(a, points, width=3):
    a.line(points,'#604233',width+1)
    a.line(points,'#dbb482',width)
    if a.variant!=2: a.line([(x-.35,y-.35) for x,y in points],'#f5d5a3',.55)


def rope(a, loop=False):
    v=a.variant
    if loop:
        pts=[(16+math.sin(i/48*math.pi*2)*(7+v),11+math.cos(i/48*math.pi*2)*8) for i in range(49)]
        rope_line(a,pts,2.2)
        rope_line(a,[(16,19),(13,24),(18,29),(25,27)],2.3)
        for y in [19,21,23]: a.line([(13,y),(18,y+1)],'#664635',.8)
    else:
        a.ellipse((5,6,27,26),'#ffffff00','#614331',4.5)
        a.ellipse((5.8,6.8,26.2,25.2),'#ffffff00','#dbb482',3)
        rope_line(a,[(7,20),(12,12),(21,21),(26,10)],2.2)
        rope_line(a,[(8,10),(19,12),(21,19),(10,23)],2.5)
        a.ellipse((12,12,19,19),'#e6c694','#78533c',.8)
        rope_line(a,[(16,19),(13,28)],2)
        rope_line(a,[(19,18),(25,26)],2)
    if v==1: a.line([(7,8),(9,10),(7,12)],'#fff0c8',.6)


def hand(a):
    v=a.variant
    a.path('M 12 30 L 11 25 C 6 21 6 18 5 15 C 4 12 7 11 9 16 L 10 17 L 9 6 C 9 3 12 3 12 6 L 13 14 L 13 3 C 13 1 16 1 16 4 L 16 14 L 17 5 C 17 2 20 3 20 6 L 20 15 L 22 9 C 23 6 25 7 25 10 L 24 20 C 24 24 21 26 21 30 Z',
           ['#f3c4a1','#d9edf5','#e6ceb5'][v],['#7d554c','#48718a','#675355'][v],.85)
    a.line([(13,21),(15,17),(20,17)],'#b57e6b',.8)
    a.line([(3,8),(2,5),(4,3)],'#9bcadd',.9)
    a.line([(27,19),(30,17),(29,14)],'#9bcadd',.9)


def arrow(a):
    v=a.variant
    shape=[[(5,14),(16,2),(27,14),(20,14),(24,29),(8,29),(12,14)],
           [(4,13),(16,2),(28,13),(20,13),(23,30),(9,30),(12,13)],
           [(6,12),(16,2),(26,12),(20,12),(25,29),(7,29),(12,12)]][v]
    a.polygon(shape,['#5dafeb','#328ddd','#86c9ef'][v],'#244d85',1)
    if v!=1: a.line([(16,6),(16,12)],'#d5f3ff',1)
    if v==2: a.line([(12,25),(20,25)],'#3687bc',.7)


def flask(a):
    v=a.variant
    for x,y,s in [[(6,8,8),(26,6,8),(27,15,5)],[(5,6,6),(26,10,9),(5,19,6)],[(5,12,7),(24,6,9),(28,19,5)]][v]:
        heart(a,x,y,s,'#f792c0','#ae4c84',1)
    a.path('M 12 3 L 20 3 L 20 6 L 18 6 L 18 13 L 26 25 C 27 28 25 30 23 30 L 8 30 C 5 30 5 27 6 25 L 14 13 L 14 6 L 12 6 Z','#e8f7fc','#5b6785',.9)
    a.path('M 11 19 C 14 17 17 21 21 19 L 25 26 C 26 28 24 29 22 29 L 9 29 C 6 29 7 27 8 25 Z',['#ed62ad','#c8499b','#ee85ba'][v])
    a.line([(15,7),(15,12)],'#ffffff',1)
    a.ellipse((18,22,21,25),'#ffcae7')


def droplet(a, small=False):
    v=a.variant; k=.72 if small else 1
    for w,y in [(12,27),(8,25)]:
        a.ellipse((16-w*k,y-2*k,16+w*k,y+2*k),'#ffffff00',['#cc587e','#d47b94','#b64b72'][v],.9)
    pts=[]
    # Teardrop with a tapered pointed top, bulging lower lobe.
    for i in range(80):
        t=i/79*math.pi*2
        pts.append((16+math.sin(t)*(1-math.cos(t)) * 4*k,13-math.cos(t)*10*k))
    a.polygon(pts,['#d64164','#b9204d','#f06480'][v],'#701e43',.9)
    if v!=1: a.line([(16-3.5*k,13+3*k),(16-2.3*k,13+6*k)],'#ffc3cf',k)


def winged(a):
    v=a.variant
    a.path('M 13 14 C 9 6 4 3 2 4 L 3 17 Q 6 12 8 20 Q 10 16 13 22 Z',['#dc64a3','#ec94c5','#b94d8c'][v],'#713258',.9)
    a.path('M 19 14 C 23 6 28 3 30 4 L 29 17 Q 26 12 24 20 Q 22 16 19 22 Z',['#dc64a3','#ec94c5','#b94d8c'][v],'#713258',.9)
    if v!=1:
        a.line([(3,5),(11,16)],'#f6b2d3',.6); a.line([(29,5),(21,16)],'#f6b2d3',.6)
    heart(a,16,18,19,'#f279b4','#793053',v)


def dumbbell(a):
    v=a.variant
    a.roundrect((7,13,25,19),1.5,'#a9b2c8','#41465b',.9)
    for x in [5,22]:
        a.roundrect((x,8,x+5,24),1.5,['#69758e','#4e596e','#8b98ad'][v],'#30364e',1)
    for x in [2,28]: a.roundrect((x,11,x+2,21),.8,'#bdc5d6','#46516c',.65)
    a.line([(4,5),(7,3),(10,5),(13,3)],'#e87eb5',1.1)
    a.line([(19,28),(22,26),(25,28),(29,26)],'#e87eb5',1.1)


def person(a, running=False):
    v=a.variant; color=['#ef91bf','#d875aa','#e3a6cb'][v]; edge='#693452'
    if running:
        a.ellipse((18,2,24,8),color,edge,.65)
        points=[[(18,10),(14,17),(19,21),(14,29)],[(18,10),(13,17),(21,20),(24,28)],[(19,10),(17,18),(10,22),(8,29)]][v]
        a.line(points,edge,4.2); a.line(points,color,2.8)
        a.line([(14,17),(10,23),(3,23)],edge,3.8); a.line([(14,17),(10,23),(3,23)],color,2.4)
        a.line([(17,11),(22,14),(28,10)],edge,3.4); a.line([(17,11),(22,14),(28,10)],color,2.1)
        a.line([(16,10),(10,9),(7,14)],color,2.3)
        a.line([(3,8),(8,8)],'#f3cae0',.8)
    else:
        a.ellipse((13,2,19,8),color,edge,.65)
        if v==0:
            a.path('M 13 10 L 19 10 L 20 19 L 27 24 Q 30 28 23 28 L 9 28 Q 2 28 5 24 L 12 19 Z',color,edge,.9)
            a.line([(13,12),(8,19),(3,18)],color,2.2); a.line([(19,12),(24,19),(29,18)],color,2.2)
            a.line([(10,24),(22,27)],edge,.8)
        elif v==1:
            a.line([(14,10),(13,20),(19,29)],edge,4); a.line([(14,10),(13,20),(19,29)],color,2.7)
            a.line([(13,20),(22,20),(16,15)],color,2.6)
            a.line([(14,11),(8,7),(16,2),(23,8),(18,11)],color,2)
        else:
            a.line([(14,10),(15,20),(8,29)],color,3)
            a.line([(15,20),(24,27),(28,27)],color,3)
            a.line([(14,11),(5,11),(2,8)],color,2.4)
            a.line([(18,11),(25,11),(29,8)],color,2.4)


def book(a):
    v=a.variant
    if v==1:
        a.path('M 3 6 Q 9 3 16 7 Q 23 3 29 6 L 29 27 Q 22 24 16 28 Q 9 24 3 27 Z','#e88fb9','#813654',.9)
        a.line([(16,7),(16,27)],'#9f436f',1)
        a.text('♀',(23,16),14,'#fff2f8',max_width=12,stroke='#aa4c7b',stroke_width=.3)
    else:
        a.path('M 6 3 L 24 3 L 27 6 L 27 29 L 6 29 Q 3 28 3 25 L 3 7 Q 3 3 6 3 Z',['#e781b2','#e781b2','#d95b9b'][v],'#743154',1)
        a.line([(7,4),(7,25)],'#a54878',1)
        a.roundrect((7,25,25,28),1,'#f7dde9')
        a.text('♀',(17,14.5),19,'#ffeef7',max_width=19,stroke='#a84276',stroke_width=.4)


def mist(a):
    v=a.variant
    for x,y,w,h in [[(2,7,21,19),(10,4,29,17),(8,16,29,27)],[(3,11,24,24),(8,4,21,18),(16,8,30,22)],[(2,15,27,27),(3,5,22,20),(16,9,30,24)]][v]:
        a.ellipse((x,y,w,h),'#e981b977')
    for pts in [[(5,12),(10,9),(15,11),(20,9),(27,12)],[(4,20),(10,18),(16,21),(23,18),(28,20)]]:
        a.line(pts,'#f5b3dca0',1.2)
    if v!=1: a.ellipse((3,26,6,29),'#efafd5a0')


def feminine(a):
    v=a.variant
    heart(a,16,16,29,['#d95b99','#ed91ba','#b84c82'][v],'#773051',v)
    # Neutral, clothed dress silhouette; no anatomical detail.
    a.ellipse((13,5,19,11),'#fff0fa','#7a3c65',.5)
    a.path('M 13 12 L 19 12 L 18 18 L 22 25 L 10 25 L 14 18 Z','#fff0fa','#783654',.65)
    a.line([(12,13),(9,20)],'#fff0fa',1.7); a.line([(20,13),(23,20)],'#fff0fa',1.7)
    a.line([(14,25),(14,29)],'#fff0fa',1.6); a.line([(18,25),(18,29)],'#fff0fa',1.6)


def tentacle(a):
    v=a.variant
    paths=[
      'M 5 30 C 4 21 6 13 12 9 C 18 4 26 6 26 12 C 26 17 19 19 17 14 C 16 12 18 10 20 11 C 18 7 13 12 13 16 C 13 23 20 24 23 30 Z',
      'M 8 30 C 5 24 5 17 10 13 C 16 9 24 12 25 7 C 26 4 22 3 21 6 C 17 1 28 0 29 7 C 30 16 17 15 15 20 C 13 24 18 28 20 30 Z',
      'M 4 30 C 6 24 14 20 17 16 C 22 11 20 5 16 6 C 12 7 16 11 17 9 C 17 14 10 12 10 7 C 10 1 21 1 24 7 C 29 17 17 23 19 30 Z']
    a.path(paths[v],['#b34487','#9c286d','#cd639e'][v],'#60234e',.9)
    for x,y in [[(9,25),(9,20),(11,15),(15,11)],[(11,27),(10,23),(13,18),(19,14)],[(10,27),(14,23),(21,17),(22,11)]][v]:
        a.ellipse((x-1,y-1,x+1,y+1),'#f7b8d8','#7b325d',.3)


def make_art(id, variant):
    a=Art(variant)
    sensitivity=re.fullmatch(r'([ABCVM])SensitivityLv([1-5])',id)
    if sensitivity:
        part,lv=sensitivity.groups(); tile(a,part+'感',int(lv),int(lv)-1)
    elif id in ('Starvation','Hunger'): stomach(a,'餓' if id=='Starvation' else '空','#bd2f48' if id=='Starvation' else '#ac561c')
    elif id in ('ExtremeFatigue','Fainted'): face(a,id=='Fainted')
    elif id=='Charm':
        heart(a,16,16,29,['#ffd2e3','#f7b7d4','#ffe0ed'][variant],'#b95686',variant)
        a.text('誘',(16,15),20,'#b22c77',stroke='#ffeaf3',stroke_width=.4,max_width=23)
        a.line([(25,3),(28,1.8)],'#e873a5',1)
    elif id=='Aftershocks':
        if variant==0: a.roundrect((3,5,29,27),5,'#794faa','#c6a4e4',.8)
        elif variant==1: a.ellipse((2,4,30,28),'#704499','#bf9ddb',.9)
        else: a.path('M 5 6 Q 11 2 16 6 Q 23 2 28 7 L 27 25 Q 22 29 17 26 Q 10 30 4 25 Z','#8c63b7','#c5a5e4',.8)
        tremble(a,'#bca0e0',1,variant)
        a.text('余韻',(16,16),12.7,'#ffffff',max_width=27,stroke='#533170',stroke_width=.35)
    elif id=='Estrus':
        for s,col in [(28,'#f5a5b9'),(24,'#e76689'),(19,'#c62657')]: heart(a,16,16,s,col,'#9d2c56',1)
        a.text('発情',(16,15),12.5,'#fff5fa',stroke='#9a2350',stroke_width=.6,max_width=27)
        if variant==1: a.line([(2,18),(5,15),(7,20),(9,17)],'#f9bad0',.8)
        if variant==2: a.line([(24,4),(28,2.5)],'#e76689',1)
    elif id=='Aphrodisiac': flask(a)
    elif id in ('Horny','InHeat','Frustrated','DesperateToCum'):
        index=['Horny','InHeat','Frustrated','DesperateToCum'].index(id)
        tile(a,'欲情','MAX' if index==3 else index+1,index)
    elif id.startswith('Intruded'): portal(a,'侵',id[-1])
    elif id.startswith('Insert'): portal(a,'挿',id[-1])
    elif id.startswith('Infested'): infestation(a,id[8],id.endswith('AphrodisiacSlime'))
    elif id in ('MultipleOrgasms','OrgasmsHell','MultipleOrgasmsTorture'): heart_cluster(a,{'MultipleOrgasms':2,'OrgasmsHell':3,'MultipleOrgasmsTorture':4}[id])
    elif id in ('Bound','Binding'): rope(a,id=='Binding')
    elif id=='Escaping': hand(a)
    elif id=='Focused': arrow(a)
    elif id in ('succubusBlood','lilimBlood'): droplet(a,id=='lilimBlood')
    elif id=='contractSigil': winged(a)
    elif id=='neverSkipPussyDay': dumbbell(a)
    elif id in ('extremeYoga','marathonRunner'): person(a,id=='marathonRunner')
    elif id=='manualOfBrothel': book(a)
    elif id=='pheromones': mist(a)
    elif id=='alluringBody': feminine(a)
    elif id=='livingClothes': tentacle(a)
    else: raise ValueError('No design implementation for '+id)
    return a


def instructions():
    result=[]
    for kind,file in [('Status','statuses.ts'),('Relic','relics.ts')]:
        source=(ROOT/'src/data'/file).read_text(encoding='utf-8')
        for match in re.finditer(r'// アイコン画像: (\w+)\.png / (.+)',source):
            id,desc=match.groups()
            result.append(dict(kind=kind,id=id,instruction=desc.removeprefix('デザイン案: '),size=32 if kind=='Status' else 42))
    if len({(r['kind'],r['id']) for r in result})!=len(result): raise ValueError('Duplicate icon comments')
    return result


def build(output):
    output.mkdir(parents=True,exist_ok=False)
    records=instructions()
    all_images=[]
    for row in records:
        row['variants']=[]
        for index in range(1 if 'SensitivityLv' in row['id'] else 3):
            label='ABC'[index]
            folder=output/row['kind']/row['id']/label
            art=make_art(row['id'],index)
            im=art.save(folder,row['size'])
            alpha=im.getchannel('A')
            if alpha.getextrema()[0]!=0 or alpha.getextrema()[1]==0: raise ValueError('Invalid transparency: '+row['id'])
            relative=(folder/'icon.png').relative_to(output).as_posix()
            row['variants'].append(dict(variant=label,file=relative,textLayers=art.labels))
            all_images.append((row['kind'],row['id'],label,im))
    manifest=dict(method='Deterministic vector shapes + font-rendered text; no AI-painted lettering',
                  fonts={'japanese':str(JP_FONT),'latin':str(LATIN_FONT)},icons=records,count=len(all_images))
    (output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    template=(Path(__file__).with_name('review.html')).read_text(encoding='utf-8')
    (output/'index.html').write_text(template.replace('__MANIFEST__',json.dumps(manifest,ensure_ascii=False).replace('</','<\\/')),encoding='utf-8')
    # The contact sheet is an index for the user's review, not an automated visual approval.
    for kind in ['Status','Relic']:
        rows=[r for r in records if r['kind']==kind]
        sheet=Image.new('RGB',(820,60+len(rows)*80),'#151c28');d=ImageDraw.Draw(sheet)
        f=ImageFont.truetype(str(LATIN_FONT),16)
        d.text((18,16),kind+' / A, B, C / actual size + 2x',font=f,fill='#edf2fa')
        for i,row in enumerate(rows):
            y=55+i*80
            d.text((15,y+20),row['id'],font=ImageFont.truetype(str(LATIN_FONT),12),fill='#d3dce8')
            for j,variant in enumerate(row['variants']):
                im=Image.open(output/variant['file']);x=280+j*175
                sheet.paste(im,(x,y+12),im)
                large=im.resize((row['size']*2,row['size']*2),Image.Resampling.NEAREST)
                # 42px relic previews use 1.5x here; full 4x is available in HTML.
                if large.height>70: large=im.resize((63,63),Image.Resampling.NEAREST)
                sheet.paste(large,(x+50,y),large)
        sheet.save(output/(kind+'-contact-sheet.png'))
    (output/'README.txt').write_text(
        'Open index.html to compare at actual size and 4x. Select A/B/C and export JSON.\n'
        'Candidates are not installed into the game. Final install name: image/icon/{Status|Relic}/ID.png.\n'
        'Each candidate contains icon.png, artwork.png, lettering.png, artwork.svg, lettering.json.\n'
        'PNG is authoritative: SVG stores geometry; alpha gradients and all lettering are separately rasterized.\n'
        'Fonts are rendered into PNGs, not copied or embedded. Font filenames are recorded in manifest.json.\n',encoding='utf-8')
    print(json.dumps({'output':str(output),'icons':len(records),'candidates':len(all_images),
                      'statusSize':32,'relicSize':42,'pngAlpha':'verified','fonts':'Noto Sans JP / Bahnschrift'},ensure_ascii=False))


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',default='image/icon/candidates/2026-10-02')
    parser.add_argument('--jp-font',type=Path,default=JP_FONT)
    parser.add_argument('--latin-font',type=Path,default=LATIN_FONT)
    args=parser.parse_args()
    JP_FONT=args.jp_font; LATIN_FONT=args.latin_font
    target=(ROOT/args.output).resolve()
    if not target.is_relative_to(ROOT): raise ValueError('Output must stay inside the project')
    if target.exists(): raise FileExistsError('Choose a new output folder; existing assets are not overwritten')
    build(target)
