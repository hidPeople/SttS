"""Alternative white underwear silhouettes, using the existing editable vector icon system.
Only writes review candidates; it does not replace the adopted game icon.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from build import Art

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'image/icon/candidates/burusera-revision'
EDGE = '#4c5b78'
WHITE = '#fffefa'
SHADOW = '#ccd7e6'

def bow(a, x=16, y=12):
    a.path(f'M {x} {y} Q {x-5} {y-4} {x-4} {y} Q {x-3} {y+2} {x} {y} Z', '#c6d3e8', EDGE, .45)
    a.path(f'M {x} {y} Q {x+5} {y-4} {x+4} {y} Q {x+3} {y+2} {x} {y} Z', '#e8edf5', EDGE, .45)
    a.ellipse((x-.8,y-.8,x+.8,y+.8), WHITE, EDGE, .45)
    a.line([(x-.4,y+.5),(x-1.5,y+3)], EDGE, .45)
    a.line([(x+.4,y+.5),(x+1.5,y+3)], EDGE, .45)

def tag(a):
    a.line([(26,8),(28,2)], '#9f7c45', .6)
    a.path('M 26 1 L 30 2 L 31 8 L 27 9 L 25 4 Z', '#f2d18b', '#916d37', .6)
    a.ellipse((26.4,2.5,27.8,3.9), EDGE)

def classic(a):
    # Broad waist, two scooped leg openings, and a short narrow gusset.
    a.path('M 2 7 Q 16 9 30 7 L 28 16 C 24 14 20 18 19 25 Q 16 26 13 25 C 12 18 8 14 4 16 Z', WHITE, EDGE, 1)
    a.path('M 2 7 Q 16 9 30 7 L 29.3 10 Q 16 12 2.7 10 Z', '#e6ecf4', EDGE, .55)
    a.path('M 4 14 C 10 13 14 19 14 25 L 12.5 24 C 11 18 8 16 4 16 Z', SHADOW)
    a.path('M 28 14 C 22 13 18 19 18 25 L 19.5 24 C 21 18 24 16 28 16 Z', SHADOW)
    a.line([(13.4,23),(18.6,23)], '#aebed2', .45)
    a.path('M 10 12 Q 11 15 13 17 Q 10 16 9 13 Z', '#e3e9f1')
    bow(a); tag(a)

def lace(a):
    a.path('M 2 6 Q 16 10 30 6 L 28 14 C 23 14 20 18 19 25 L 13 25 C 12 18 9 14 4 14 Z', WHITE, EDGE, 1)
    a.path('M 2 6 Q 16 10 30 6 L 29 11 Q 16 15 3 11 Z', '#e6eaf2', EDGE, .6)
    for x,y in [(4,9),(7,10),(10,10.7),(13,11.2),(16,11.5),(19,11.2),(22,10.7),(25,10),(28,9)]:
        a.ellipse((x-.8,y-.8,x+.8,y+.8), WHITE, '#96a9c5', .35)
    a.path('M 4 12 C 10 14 14 19 14 25 L 12.5 24 C 11 18 8 15 4 14 Z', SHADOW)
    a.path('M 28 12 C 22 14 18 19 18 25 L 19.5 24 C 21 18 24 15 28 14 Z', SHADOW)
    bow(a,16,14); tag(a)

def lowrise(a):
    a.path('M 2 10 L 5 8 Q 16 15 27 8 L 30 10 L 28 15 C 23 14 20 19 18.5 26 L 13.5 26 C 12 19 9 14 4 15 Z', WHITE, EDGE, 1)
    a.path('M 2 10 L 5 8 Q 16 15 27 8 L 30 10 L 29 12 Q 16 18 3 12 Z', '#e5ebf4', EDGE, .65)
    a.path('M 4 13 C 10 14 13 20 14.5 26 L 13 25 C 11 19 8 16 4 15 Z', SHADOW)
    a.path('M 28 13 C 22 14 19 20 17.5 26 L 19 25 C 21 19 24 16 28 15 Z', SHADOW)
    a.line([(14,24),(18,24)], '#a5b6ce', .5)
    bow(a,16,15); tag(a)

if __name__ == '__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    sheet=Image.new('RGB',(600,285),'#263140')
    pen=ImageDraw.Draw(sheet)
    font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',17)
    rows=[]
    for i,(key,label,draw) in enumerate([('A','Classic',classic),('B','Lace',lace),('C','Low rise',lowrise)]):
        a=Art();draw(a)
        icon=Image.alpha_composite(a.image,a.text_layer).resize((42,42),Image.Resampling.LANCZOS)
        icon.save(OUT/f'burusera-{key}.png',optimize=True)
        x=i*200
        pen.text((x+22,14),f'{key} / {label}',fill='white',font=font)
        sheet.paste(icon,(x+79,48),icon)
        large=a.image.resize((150,150),Image.Resampling.LANCZOS)
        sheet.paste(large,(x+25,104),large)
        rows.append(f'<section><h2>{key} / {label}</h2><img src="burusera-{key}.png" width="42" height="42"><p>42px</p><img src="burusera-{key}.png" width="168" height="168"></section>')
        assert icon.mode=='RGBA' and icon.getextrema()[3][0]==0
    sheet.save(OUT/'comparison.png')
    (OUT/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>ブルセラ アイコン比較</title><style>body{background:#263140;color:#fff;font:16px sans-serif;padding:30px}main{display:flex;gap:40px}section{text-align:center;padding:20px;background:#344153;border-radius:16px}img{object-fit:contain}</style><h1>ブルセラ：白い下着の形状比較</h1><p>上はゲームと同じ42px、下は拡大表示です。採用中の画像は変更していません。</p><main>'+''.join(rows)+'</main>',encoding='utf-8')
    print(OUT/'index.html')
