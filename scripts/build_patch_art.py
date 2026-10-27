"""Original decorative pixel landscapes for the patch library (not game captures)."""
from pathlib import Path
import random
D=Path(__file__).resolve().parent.parent/'patch/assets';D.mkdir(parents=True,exist_ok=True)
def rect(x,y,w,h,c):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>'
def poly(points,c):return f'<polygon points="{points}" fill="{c}"/>'
def tree(x,y,c1,c2):return rect(x+5,y+13,3,10,'#776249')+rect(x+2,y+6,10,11,c1)+rect(x,y+9,14,6,c1)+rect(x+4,y,6,10,c1)+rect(x+3,y+6,7,5,c2)+rect(x+5,y+2,3,4,c2)
def player(x,y):return rect(x+1,y,6,2,'#c75f45')+rect(x,y+2,8,2,'#d37a4d')+rect(x+1,y+4,6,4,'#edcd9f')+rect(x+1,y+8,6,5,'#344d52')+rect(x,y+8,1,4,'#edcd9f')+rect(x+7,y+8,1,4,'#edcd9f')+rect(x+1,y+13,2,2,'#293a43')+rect(x+5,y+13,2,2,'#293a43')
def svg(content):return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 104" shape-rendering="crispEdges">'+content+'</svg>'
def flowers(rng,n,colors,y0=72):
 return ''.join(rect(rng.randrange(4,156),rng.randrange(y0,101),1,1,rng.choice(colors)) for _ in range(n))
r=random.Random(6)
s=rect(0,0,160,104,'#cfe1bd')+rect(0,53,160,51,'#a3bc91')
s+=poly('0,57 0,40 12,40 12,34 27,34 27,39 41,39 41,31 60,31 60,40 78,40 78,33 96,33 96,40 117,40 117,31 141,31 141,39 160,39 160,58','#8ea790')
s+=rect(59,61,44,7,'#718d7b')+rect(55,68,52,6,'#7c947d')+rect(66,41,30,21,'#e4dfbb')+rect(64,38,34,4,'#eee8c8')+poly('61,38 81,25 101,38','#81998b')+poly('69,35 81,28 93,35','#c3ceb1')
for x in [67,76,87,94]:s+=rect(x,42,3,18,'#9caa8e')+rect(x-1,43,4,2,'#eee8c8')
s+=rect(78,48,8,14,'#4d7064')+rect(74,74,13,30,'#cbd2ab')+rect(70,89,22,6,'#cbd2ab')
for x,y in [(5,38),(21,48),(38,55),(120,43),(138,47),(111,65),(2,75),(29,78),(141,82)]:s+=tree(x,y,'#597d67','#72947a')
s+=flowers(r,60,['#dce6b8','#6d987a','#b2c99c'])+player(77,82)
forest_scene=s
(D/'odyssey.svg').write_text(svg(s))
s=rect(0,0,160,104,'#f4cba0')+rect(0,26,160,22,'#e6b18b')+rect(114,13,16,16,'#f9dfad')+rect(111,17,22,8,'#f9dfad')
s+=poly('0,65 0,45 16,45 16,35 30,35 30,40 45,40 45,55 66,55 66,49 85,49 85,38 105,38 105,49 118,49 118,43 141,43 141,55 160,55 160,71','#b39385')
s+=poly('0,71 0,60 15,60 15,54 29,54 29,63 39,63 39,70 112,70 112,60 131,60 131,54 145,54 145,62 160,62 160,104 0,104','#687f68')
s+=rect(54,60,54,44,'#87b5ad')+rect(48,68,66,36,'#87b5ad')+rect(43,87,78,17,'#87b5ad')
for y in [68,84,97]:s+=rect(65,y,15,1,'#b6d0b9')+rect(91,y+4,12,1,'#b6d0b9')
s+=rect(39,75,83,8,'#9a7256')+rect(39,74,83,2,'#e3b47e')+rect(39,80,83,2,'#684e43')
for x in range(42,122,6):s+=rect(x,73,1,11,'#715749')
for x,y in [(6,58),(25,46),(130,46),(144,63),(14,80)]:s+=tree(x,y,'#416c60','#659078')
s+=flowers(r,40,['#dbbb83','#92a47a'],80)+player(83,61)
(D/'glazed.svg').write_text(svg(s))
s=rect(0,0,160,104,'#334e68')
for x,y in [(8,15),(29,8),(58,21),(116,11),(143,28),(96,7),(134,51),(18,45)]:s+=rect(x,y,2,2,'#afc4bb')
s+=rect(124,19,13,13,'#e7d99c')+rect(121,22,19,7,'#e7d99c')
s+=poly('0,71 0,60 15,60 15,44 29,44 29,54 42,54 42,68 115,68 115,50 133,50 133,43 144,43 144,58 160,58 160,104 0,104','#283e55')
s+=rect(39,81,84,23,'#6c8990')+rect(47,76,68,6,'#8fa9a6')+rect(54,72,54,5,'#adc0af')+rect(67,77,23,27,'#9cafaa')
s+=poly('59,58 73,38 84,58 72,75','#77b5c0')+poly('73,38 73,72 84,58','#477f9c')+poly('76,63 84,23 99,54 86,78','#aacdc8')+poly('84,23 86,78 99,54','#6b9ab0')+poly('89,66 103,43 112,63 101,78','#86b6ba')+poly('103,43 101,78 112,63','#477f9c')
for x,y in [(6,66),(24,75),(129,64),(144,80)]:s+=tree(x,y,'#395760','#56777a')
s+=rect(57,82,3,2,'#d3c599')+rect(107,85,3,2,'#d3c599')+player(76,86)
(D/'azoth.svg').write_text(svg(s))
(D/'club.svg').write_text(svg(rect(0,16,160,72,'#233e35')+rect(16,0,128,104,'#233e35')+rect(24,16,112,72,'#d2ec6b')+rect(41,31,9,42,'#233e35')+rect(25,47,42,10,'#233e35')+rect(100,32,15,15,'#233e35')+rect(118,51,15,15,'#233e35')))
handheld='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 292">
<g stroke="#293e38" stroke-width="3" stroke-linejoin="round">
<path d="M47 49Q49 34 73 34h61v17H47Z" fill="#b2b4c1"/>
<path d="M346 34h61q24 0 26 15v2h-87Z" fill="#b2b4c1"/>
<path d="M82 46H398Q443 46 457 88l12 68q8 48-35 67l-57 21q-16 7-44 7H147q-28 0-44-7l-57-21Q3 204 11 156l12-68Q37 46 82 46Z" fill="#74739f"/>
<path d="M82 39H398Q443 39 457 81l12 68q8 48-35 67l-57 21q-16 7-44 7H147q-28 0-44-7l-57-21Q3 197 11 149l12-68Q37 39 82 39Z" fill="#a29acb"/>
<path d="M89 48H391Q434 48 445 85" fill="none" stroke="#c5bee3"/>
<rect x="127" y="56" width="226" height="155" rx="9" fill="#3b424c"/>
<rect x="144" y="70" width="192" height="124" rx="2" fill="#cfe1bd"/>
</g>
<g transform="translate(145 71) scale(1.1875)" shape-rendering="crispEdges">'''+forest_scene+'''</g>
<rect x="145" y="71" width="190" height="123" fill="#e5edca" opacity=".08"/>
<text x="240" y="207" text-anchor="middle" fill="#d9d8e5" font-family="monospace" font-weight="bold" font-size="8" letter-spacing="1.7">LONG PLAY DO · ADVANCE</text>
<g fill="#42465c" stroke="#293e38" stroke-width="2" stroke-linejoin="round"><path d="M58 103h21v20h20v21H79v20H58v-20H38v-21h20Z"/><circle cx="422" cy="109" r="17"/><circle cx="390" cy="145" r="17"/></g>
<path d="M64 109h9v9h-9ZM43 129h9v9h-9" fill="#70718c"/>
<g font-family="monospace" font-weight="bold" font-size="14" fill="#d8d5eb" text-anchor="middle"><text x="422" y="114">A</text><text x="390" y="150">B</text></g>
<g fill="#565771" stroke="#293e38" stroke-width="1.5"><rect x="197" y="224" width="24" height="7" rx="3.5" transform="rotate(-12 197 224)"/><rect x="244" y="224" width="24" height="7" rx="3.5" transform="rotate(-12 244 224)"/></g>
<g font-family="monospace" font-size="5" fill="#3e4053" text-anchor="middle"><text x="209" y="238">SELECT</text><text x="256" y="238">START</text></g>
<circle cx="370" cy="77" r="4" fill="#d2ec6b" stroke="#425b45" stroke-width="1.5"/>
<g fill="#686488"><rect x="343" y="221" width="3" height="12" rx="1" transform="rotate(-23 343 221)"/><rect x="350" y="219" width="3" height="12" rx="1" transform="rotate(-23 350 219)"/><rect x="357" y="217" width="3" height="12" rx="1" transform="rotate(-23 357 217)"/><rect x="364" y="215" width="3" height="12" rx="1" transform="rotate(-23 364 215)"/></g>
</svg>'''
(D/'handheld.svg').write_text(handheld)
print('Original pixel landscapes, controller and Advance-style handheld created')
