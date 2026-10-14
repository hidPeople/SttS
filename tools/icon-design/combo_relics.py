"""Rebuild the seven combo relic icons using the existing 32-unit vector system."""
from pathlib import Path
from PIL import Image
from build import Art, heart

ROOT = Path(__file__).resolve().parents[2]
EDGE = '#273349'
GOLD = '#f1cb68'
PINK = '#f282b4'

def card(a, x, y, w=11, h=17):
    a.roundrect((x, y, x+w, y+h), 1.5, '#433c66', GOLD, .8)
    heart(a, x+w/2, y+h/2, w*.65, PINK)

def professionalism(a):
    card(a, 13, 9); card(a, 19, 13)
    a.roundrect((2, 3, 20, 15), 2, '#ffebb7', '#906735', 1)
    a.roundrect((8, 1, 14, 5), 1, GOLD, EDGE, .8)
    a.ellipse((5, 7, 10, 12), '#805c44')
    a.line([(12,8),(17,8)], '#805c44', 1)
    a.line([(12,11),(16,11)], '#805c44', 1)

def provocateur(a):
    a.polygon([(6,17),(10,17),(13,28),(8,28)], '#a95887', EDGE, 1)
    a.polygon([(3,12),(11,11),(21,5),(21,25),(11,19),(3,18)], PINK, EDGE, 1)
    a.ellipse((18,5,24,25), '#772b65', '#f7bed9', 1)
    a.line([(26,10),(29,8)], GOLD, 1.4)
    a.line([(27,17),(31,17)], GOLD, 1.4)
    heart(a, 28, 25, 7, PINK)

def burusera(a):
    a.path('M 2 9 Q 16 12 29 8 L 26 17 Q 21 18 20 27 L 11 27 Q 10 18 5 18 Z', '#f4f2ef', '#76829b', 1)
    a.path('M 2 9 Q 16 12 29 8 L 28 12 Q 15 15 3 12 Z', '#d4dbea', '#76829b', .7)
    a.line([(15,13),(16,16),(17,13)], '#c18eae', 1)
    a.line([(26,10),(25,4)], GOLD, .8)
    a.polygon([(20,2),(28,2),(31,6),(28,10),(20,10)], GOLD, '#895d2c', .8)
    a.ellipse((26,4,28,6), EDGE)

def heroicAppetite(a):
    a.line([(8,29),(3,20),(4,10),(8,3)], GOLD, 1.5)
    a.line([(24,29),(29,20),(28,10),(24,3)], GOLD, 1.5)
    for x, flip in [(5,-1),(27,1)]:
        for y in [9,15,21]:
            a.ellipse((x-3,y-3,x+3,y), '#c79f49', EDGE, .4)
    heart(a,16,15,20,'#d84b69', EDGE)
    a.polygon([(18,17),(11,25),(16,25),(14,31),(24,21),(18,21)], GOLD, '#664924', .6)

def reciprocity(a):
    a.path('M 8 2 C 5 8 1 10 2 14 C 3 20 13 20 15 14 C 16 10 11 7 8 2 Z','#db4b65',EDGE,1)
    a.line([(6,8),(5,11)], '#ffc2c2', 1.2)
    a.path('M 18 9 L 30 13 L 29 23 Q 25 29 21 31 Q 15 27 14 23 L 14 14 Z', '#80b9dc', EDGE, 1)
    a.path('M 21 13 L 27 15 L 26 22 L 21 27 Z', '#c9e9ef', None)
    a.line([(6,22),(8,26),(13,28)], GOLD, 1.7)
    a.polygon([(11,25),(16,28),(10,30)], GOLD, EDGE, .5)

def todaysTreat(a):
    a.ellipse((3,18,30,30), '#c6d5e7', EDGE, 1)
    a.ellipse((6,20,27,27), '#7e8da9', '#e4eefa', .6)
    card(a, 9, 8, 12, 16); card(a, 13, 5, 12, 16)
    a.line([(3,4),(3,26)], GOLD, 1.3)
    a.line([(1,3),(1,10),(5,10),(5,3)], GOLD, 1)

def secretPocket(a):
    card(a, 13, 2, 13, 19)
    a.path('M 3 11 L 29 11 L 27 26 L 16 31 L 5 26 Z', '#78529e', EDGE, 1.2)
    a.line([(5,14),(27,14)], '#c9a5dc', 1.3)
    a.line([(7,18),(8,24),(16,28),(24,24),(25,18)], '#d8b4e6', .7)
    a.ellipse((15,17,17,19), GOLD)

if __name__ == '__main__':
    target=ROOT/'image/icon/Relic'; target.mkdir(parents=True,exist_ok=True)
    for draw in [professionalism,provocateur,burusera,heroicAppetite,reciprocity,todaysTreat,secretPocket]:
        art=Art(); draw(art)
        image=Image.alpha_composite(art.image,art.text_layer).resize((42,42),Image.Resampling.LANCZOS)
        image.save(target/(draw.__name__+'.png'), optimize=True)
        assert image.mode=='RGBA' and image.getextrema()[3][0]==0
        print(draw.__name__+'.png: 42x42 RGBA')
