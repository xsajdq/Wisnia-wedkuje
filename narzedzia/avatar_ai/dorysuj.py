# Krok 2: dorysowanie brakujących fragmentów (Stable Diffusion inpainting, CPU) w wycinkach płótna
import numpy as np, torch, time
from PIL import Image, ImageFilter
from diffusers import AutoPipelineForInpainting
S='/tmp/claude-0/-home-user-Wisnia-wedkuje/4289e250-c5e0-5b8c-a0cc-39d503bd7548/scratchpad/av'
import sys
can=Image.open(S+'/'+sys.argv[1]).convert('RGB'); dor=np.load(S+'/dorysuj.npy')
pipe=AutoPipelineForInpainting.from_pretrained('Lykon/dreamshaper-8-inpainting', variant='fp16', torch_dtype=torch.float32)
pipe.set_progress_bar_config(disable=True); torch.set_num_threads(4)
NEG='blurry, deformed, extra fingers, extra limbs, text, watermark, cartoon, painting, frame, border'
zadania=[] if len(sys.argv)>2 else [
 # (x0,y0,x1,y1, rozmiar SD, prompt)
 ((880,0,2120,1040),(768,640),'photo of a young man with short dark brown hair, top of head, cloudy grey sky background, natural light, realistic'),
 ((0,560,1360,2868),(512,864),'photo of a young man sitting outdoors, left arm and shoulder in black and teal patterned t-shirt, olive cargo trousers, cloudy sky and grass, realistic'),
 ((1700,1500,3060,2868),(640,640),'photo of olive cargo trousers knee, black and teal t-shirt, green grass, realistic'),
]
if len(sys.argv)>2: zadania=[
 ((2700,1000,3784,2400),(576,744),'tall green grass and reeds under cloudy grey sky, realistic photo'),
 ((0,0,1100,900),(640,512),'cloudy grey stormy sky, tall grass tips at bottom, realistic photo'),
 ((2000,0,3784,700),(1024,400),'cloudy grey stormy sky, realistic photo'),
]
g=torch.Generator().manual_seed(7)
for (x0,y0,x1,y1),(w,h),pr in zadania:
    t=time.time()
    kaw=can.crop((x0,y0,x1,y1)); m=Image.fromarray((dor[y0:y1,x0:x1]*255).astype('uint8'))
    if np.array(m).max()==0: continue
    m=m.filter(ImageFilter.MaxFilter(15))
    out=pipe(prompt=pr,negative_prompt=NEG,image=kaw.resize((w,h)),mask_image=m.resize((w,h)),num_inference_steps=28,guidance_scale=7,strength=1.0,generator=g).images[0]
    out=out.resize(kaw.size,Image.LANCZOS)
    pm=m.filter(ImageFilter.GaussianBlur(12))
    kaw.paste(out,(0,0),pm); can.paste(kaw,(x0,y0))
    print('wycinek',(x0,y0,x1,y1),f'{time.time()-t:.0f}s',flush=True)
can.save(S+'/'+(sys.argv[2] if len(sys.argv)>2 else 'plotno_dorysowane.png'))
v=can.copy(); v.thumbnail((900,900)); v.save(S+'/dorysowane_podglad.jpg')
