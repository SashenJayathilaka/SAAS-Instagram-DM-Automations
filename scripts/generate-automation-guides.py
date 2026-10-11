"""Original AP3K illustrated walkthroughs. No third-party footage or customer data."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import subprocess, tempfile, textwrap, sys
out=Path('public/automation-guides')
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def f(size,weight=False): return ImageFont.truetype(bold if weight else font,size)
guides={
 'comment': [('Choose a post or Reel','Pick a specific post, or listen on any post.','Post / Reel'),('Choose the comment keyword','Use a short word people can easily remember.','Comment: LINK'),('Start the conversation','An opening DM invites the person to respond.','Tap to continue'),('Deliver your link','Their response opens the conversation for your next message.','Here is your link')],
 'dm': [('Choose a DM trigger','Respond to a keyword or any incoming message.','DM: LINK'),('Write your reply','Keep it helpful, personal, and easy to understand.','Thanks for reaching out'),('Add your destination','Use a clear button label and your HTTPS link.','Open the resource'),('Review before publishing','Check your message and test with a real Instagram account.','Ready to review')],
 'story': [('Choose the interaction','Select a text reply, emoji reaction, or story mention.','Story reply'),('Write the next step','Match your message to what the person asked for.','Thanks for your interest'),('Offer a useful link','Send a resource, coupon, or destination they expect.','See the offer'),('Preview your response','Check the copy and destination before publishing.','Review and publish')],
 'ai': [('Give AI a goal','Explain what a successful conversation should achieve.','Answer product questions'),('Add business context','Include accurate product information and approved links.','Your offer and FAQs'),('Try a conversation','Ask sample questions and check the generated replies.','Test in preview'),('Review and publish','AI uses your workspace access and plan allowance.','Pro / Business')],
 'email': [('Start from a keyword','Someone messages the word you have chosen.','DM: EBOOK'),('Ask for an email','Explain why you need it. SKIP and STOP stay available.','What is your email?'),('Save the reply','A valid email becomes a lead, not a marketing subscription.','person@example.com'),('Deliver the resource','Connect both the email and skip paths to your link.','Open the resource')],
 'giveaway': [('Invite an entry','A comment starts an opening DM. The person responds to enter.','Comment: WIN'),('Keep one entry per person','The same contact cannot redraw by repeating the trigger.','Entry recorded'),('Choose the probabilities','A random split chooses an outcome for each entry.','5% selected / 95% other'),('Explain the outcome','This can select zero or several people, not exactly one winner.','Add rules before publishing')],
 'canvas': [('Choose your starting step','Each flow has one entry point and clear paths forward.','Start here'),('Add conversation steps','Use messages, product cards, questions, and email collection.','Ask a question'),('Connect the answers','Each answer can lead to a different message or offer.','A to offer A / B to offer B'),('Test every path','Use the interactive phone preview, then review and publish.','Nothing sent in preview')]
}
with tempfile.TemporaryDirectory() as temp:
 for name,frames in guides.items():
  if len(sys.argv)>1 and name != sys.argv[1]: continue
  captions=['WEBVTT','']
  for i,(title,body,bubble) in enumerate(frames):
   im=Image.new('RGB',(960,720),'#0d1120');d=ImageDraw.Draw(im)
   d.rounded_rectangle((45,40,110,105),18,fill='#7c3aed');d.text((58,58),'A3',font=f(26,True),fill='white')
   d.text((130,52),'AP3K',font=f(29,True),fill='white');d.text((130,89),'AUTOMATION WALKTHROUGH',font=f(12),fill='#b9b2d0')
   d.text((48,164),f'0{i+1} / 04',font=f(18,True),fill='#bda1ff')
   for j,line in enumerate(textwrap.wrap(title,34)):d.text((48,208+j*42),line,font=f(31,True),fill='white')
   for j,line in enumerate(textwrap.wrap(body,58)):d.text((48,321+j*29),line,font=f(23),fill='#bdc6df')
   d.rounded_rectangle((48,453,908,569),23,fill='#22293c',outline='#434c69',width=2)
   d.ellipse((76,486,126,536),fill='#7c3aed');d.text((88,498),'A',font=f(22,True),fill='white')
   d.text((153,493),bubble,font=f(26,True),fill='#f4f0ff')
   for j in range(4):d.rounded_rectangle((48+j*218,635,247+j*218,642),3,fill='#9865ff' if j<=i else '#30374d')
   d.text((48,665),'Illustrated example • No messages are sent',font=f(15),fill='#96a1b9')
   path=Path(temp)/f'{name}-{i}.png';im.save(path)
   if name=='canvas' and i==0:im.save(out/'flow-preview.jpg',quality=88)
   captions += [f'00:{i*4:02d}.000 --> 00:{(i+1)*4:02d}.000',title+'. '+body,'']
  listing=Path(temp)/f'{name}.txt';listing.write_text(''.join(f"file '{temp}/{name}-{i}.png'\nduration 4\n" for i in range(4))+f"file '{temp}/{name}-3.png'\n")
  subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(listing),'-vf','fps=24,format=yuv420p','-c:v','libx264','-threads','2','-preset','fast','-crf','25','-movflags','+faststart','-t','16',str(out/f'{name}.mp4')],check=True)
  (out/f'{name}.vtt').write_text('\n'.join(captions))
print('Generated 7 original illustrated guides with captions.')
