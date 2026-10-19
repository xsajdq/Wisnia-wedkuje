# Krok 1: przesunięcie ryby z dłonią pod twarz + powiększenie płótna (góra/lewo) + maski do dorysowania
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
S='/tmp/claude-0/-home-user-Wisnia-wedkuje/4289e250-c5e0-5b8c-a0cc-39d503bd7548/scratchpad/av'
im=Image.open('assets/avatar/zrodlo.jpg').convert('RGB'); W,H=im.size
b=lambda p: np.array(Image.open(p).convert('L'))>127
P=b('assets/avatar/maska.png')
nadg=Image.new('L',(W,H),0); ImageDraw.Draw(nadg).polygon([(1470,1900),(1950,1900),(1930,2150),(1800,2260),(1560,2250),(1470,2150)],fill=255)
M=b(S+'/m_ryba.png')|b(S+'/m_reka.png')|(np.array(nadg)>0)&P
Mi=Image.fromarray((M*255).astype('uint8')).filter(ImageFilter.MaxFilter(9))
DX,DY=-600,0; TOP,LEFT=420,520
CW,CH=W+LEFT,H+TOP
can=Image.new('RGB',(CW,CH),(128,128,128)); can.paste(im,(LEFT,TOP))
# warstwa ruchoma
warstwa=im.copy(); 
nowa=Image.new('L',(CW,CH),0); nowa.paste(Mi,(LEFT+DX,TOP+DY))
stara=Image.new('L',(CW,CH),0); stara.paste(Mi,(LEFT,TOP))
can.paste(warstwa,(LEFT+DX,TOP+DY),Mi.filter(ImageFilter.GaussianBlur(2)))
# maska do dorysowania: nowe marginesy + odsłonięte miejsce po rybie
dor=np.zeros((CH,CW),bool); dor[:TOP+6,:]=True; dor[:,:LEFT+6]=True
dor|=(np.array(stara)>0)&~(np.array(nowa)>0)
dor&=~(np.array(nowa)>200)
np.save(S+'/dorysuj.npy',dor)
can.save(S+'/plotno.png')
# maska postaci po przesunięciu (do kompozycji)
Pn=np.zeros((CH,CW),bool); Pn[TOP:,LEFT:]=P&~(np.array(Mi)>0)
Pn|=np.array(nowa)>127
Image.fromarray((Pn*255).astype('uint8')).save(S+'/postac_przesunieta.png')
v=can.copy(); r=Image.new('RGB',(CW,CH),(255,0,0)); v.paste(r,mask=Image.fromarray((dor*120).astype('uint8'))); v.thumbnail((900,900)); v.save(S+'/uklad_podglad.jpg')
print(CW,CH)
