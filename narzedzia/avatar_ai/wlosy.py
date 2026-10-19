# Ponowne dorysowanie włosów: krótkie, ciemnobrązowe, płasko zaczesane na bok (wg zdjęć referencyjnych)
import numpy as np, torch, time
from PIL import Image, ImageFilter
from diffusers import AutoPipelineForInpainting
S='/tmp/claude-0/-home-user-Wisnia-wedkuje/4289e250-c5e0-5b8c-a0cc-39d503bd7548/scratchpad/av'
can=Image.open(S+'/plotno_final.png').convert('RGB'); dor=np.load(S+'/dorysuj.npy')
pipe=AutoPipelineForInpainting.from_pretrained('Lykon/dreamshaper-8-inpainting', variant='fp16', torch_dtype=torch.float32)
pipe.set_progress_bar_config(disable=True); torch.set_num_threads(4)
x0,y0,x1,y1=880,0,2120,1040
PR='photo of a man with very short dark brown hair, short neat haircut, hair lying flat on top and combed forward to the side, low volume, rounded top of head, cloudy grey sky background, realistic'
NEG='quiff, pompadour, spiky hair, tall hair, messy hair, curly hair, voluminous hair, blurry, deformed, text, watermark, cartoon'
kaw=can.crop((x0,y0,x1,y1)); m=Image.fromarray((dor[y0:y1,x0:x1]*255).astype('uint8')).filter(ImageFilter.MaxFilter(15))
pm=m.filter(ImageFilter.GaussianBlur(12))
for seed in (11,23,42):
    t=time.time()
    out=pipe(prompt=PR,negative_prompt=NEG,image=kaw.resize((768,640)),mask_image=m.resize((768,640)),num_inference_steps=28,guidance_scale=7.5,generator=torch.Generator().manual_seed(seed)).images[0]
    k=kaw.copy(); k.paste(out.resize(kaw.size,Image.LANCZOS),(0,0),pm); k.save(S+f'/wlosy_{seed}.png')
    print(seed,f'{time.time()-t:.0f}s',flush=True)
