# Copyright 2026 Mr Dark
# Project: DeepSeek Chat
# Author: t.me/sii_3
# Licensed under Apache License 2.0

from __future__ import 𝚊𝚗𝚗𝚘𝚝𝚊𝚝𝚒𝚘𝚗𝚜

dark='t.me/sii_3'
версия='Выпустобщено в @2026'
работа='Use official DeepSeek App-Python with no limits — file uploads and all essential features supported.'
мы='By: dark.ps'


𝚜𝚒𝚒_𝟹='''
"default" (V4-Flash) ~ (Thinking "True" - V4-Pro)

×-------------------𝙳𝙰𝚁𝙺-------------------×

"expert" (V3.2) ~ (Thinking "True" - R1)

         ↘
'''
𝚖𝚘𝚍𝚎𝚕="default" # читайте выше в разделе "𝚜𝚜𝚒_𝟹"
𝚃𝚑𝚒𝚗𝚔𝚒𝚗𝚐=False # читайте выше в разделе "𝚜𝚒𝚒_𝟹"
𝚜𝚎𝚊𝚛𝚌𝚑=False # включить веб-поиск (WebPage)


# Получите свой токен-аккаунт: `console.log(localStorage.getItem("userToken"))`
𝚃𝚘𝚔𝚎𝚗="53gX/jfDTrzWjeNpZsCNbhm+mnZB1QoynBAIdQ+QoznBVYvCqsuLQZMHSdSecRk/" # Токен можно изменить

# приложите доказательства
𝙵𝚒𝚕𝚎𝚜=r"""

"""

𝚙𝚛𝚘𝚖𝚙𝚝=r"""
привет шлюха .. как дела? :|
"""
𝚜𝚢𝚜𝚝𝚎𝚖=r"""
отныне твое имя — "шлюха"
"""
𝙿𝙰 = "https://dark.ps/deepseek/pow" # вы можете изменить (pow.App)


_𝙷='response'
_𝙶='challenge'
_𝙵='message_id'
_𝙴='x-ds-pow-response'
_𝙳=True
_𝙲='think'
_𝙱=False
_𝙰=None
import 𝚓𝚜𝚘𝚗,𝚘𝚜,𝚛𝚎,𝚜𝚢𝚜,𝚝𝚒𝚖𝚎,𝚝𝚑𝚛𝚎𝚊𝚍𝚒𝚗𝚐,𝚖𝚒𝚖𝚎𝚝𝚢𝚙𝚎𝚜
from dataclasses import 𝚍𝚊𝚝𝚊𝚌𝚕𝚊𝚜𝚜,𝚊𝚜𝚍𝚒𝚌𝚝
from pathlib import 𝙿𝚊𝚝𝚑
from typing import 𝙳𝚒𝚌𝚝,𝙻𝚒𝚜𝚝
import 𝚑𝚝𝚝𝚙𝚡,𝚛𝚎𝚚𝚞𝚎𝚜𝚝𝚜
from dotenv import 𝚕𝚘𝚊𝚍_𝚍𝚘𝚝𝚎𝚗𝚟
𝚕𝚘𝚊𝚍_𝚍𝚘𝚝𝚎𝚗𝚟()
𝚁=𝙿𝚊𝚝𝚑(__file__).resolve().parent
𝚂𝙵=𝚁/'session'/'session.json'
𝙱='https://chat.deepseek.com'
𝙲𝙿='/api/v0/chat/completion'
𝚄𝙿='/api/v0/file/upload_file'
𝙳𝙼='\x1b[2m\x1b[37m'
𝙱𝙳='\x1b[1m'
𝚁𝚂='\x1b[0m'
def 𝚙𝚏(𝚜):return[𝙰 for 𝙰 in 𝚛𝚎.split('\\s+',𝚜.strip())if 𝙰]
𝚏𝚒𝚕𝚎𝚜=𝚙𝚏(𝙵𝚒𝚕𝚎𝚜)
@𝚍𝚊𝚝𝚊𝚌𝚕𝚊𝚜𝚜
class 𝚂:
	𝚝𝚘𝚔𝚎𝚗:str;𝚌𝚘𝚘𝚔𝚒𝚎𝚜:𝙳𝚒𝚌𝚝[str,str];𝚞𝚜𝚎𝚛_𝚊𝚐𝚎𝚗𝚝:str;𝚌𝚊𝚙𝚝𝚞𝚛𝚎𝚍_𝚊𝚝:float
	def 𝚜𝚟(𝙰,𝚙=𝚂𝙵):𝚙.parent.mkdir(parents=_𝙳,exist_ok=_𝙳);𝚙.write_text(𝚓𝚜𝚘𝚗.dumps(𝚊𝚜𝚍𝚒𝚌𝚝(𝙰),indent=2),encoding='utf-8')
	@classmethod
	def 𝚕𝚍(𝙰,𝚙=𝚂𝙵):
		if not 𝚙.exists():return
		try:return 𝙰(**𝚓𝚜𝚘𝚗.loads(𝚙.read_text('utf-8')))
		except:return
def 𝚎𝚜():
	𝙲=𝚘𝚜.getenv('DEEPSEEK_TOKEN','').strip()
	if not 𝙲:return
	𝙰=𝚘𝚜.getenv('DEEPSEEK_COOKIES','').strip();𝙴=𝚘𝚜.getenv('DEEPSEEK_USER_AGENT','').strip();𝙱={}
	if 𝙰:
		try:𝙱=𝚓𝚜𝚘𝚗.loads(𝙰)
		except:
			for 𝙳 in 𝙰.split(';'):
				if'='in 𝙳:𝙵,𝙶=𝙳.split('=',1);𝙱[𝙵.strip()]=𝙶.strip()
	return 𝚂(𝚝𝚘𝚔𝚎𝚗=𝙲,𝚌𝚘𝚘𝚔𝚒𝚎𝚜=𝙱,𝚞𝚜𝚎𝚛_𝚊𝚐𝚎𝚗𝚝=𝙴,𝚌𝚊𝚙𝚝𝚞𝚛𝚎𝚍_𝚊𝚝=𝚝𝚒𝚖𝚎.𝚝𝚒𝚖𝚎())
def 𝚐𝚜():
	if 𝚃𝚘𝚔𝚎𝚗:return 𝚂(𝚝𝚘𝚔𝚎𝚗=𝚃𝚘𝚔𝚎𝚗,𝚌𝚘𝚘𝚔𝚒𝚎𝚜={},𝚞𝚜𝚎𝚛_𝚊𝚐𝚎𝚗𝚝='',𝚌𝚊𝚙𝚝𝚞𝚛𝚎𝚍_𝚊𝚝=𝚝𝚒𝚖𝚎.𝚝𝚒𝚖𝚎())
	𝙰=𝚎𝚜()
	if 𝙰:return 𝙰
	𝙱=𝚂.𝚕𝚍()
	if 𝙱:return 𝙱
	print('ERR no session',file=𝚜𝚢𝚜.stderr);𝚜𝚢𝚜.exit(1)
𝙴𝚇={'.pdf','.doc','.docx','.txt','.md','.markdown','.csv','.xlsx','.xls','.ppt','.pptx','.png','.jpg','.jpeg','.gif','.webp'}
def 𝚌𝚔(𝚙𝚝):
	𝙰=𝙿𝚊𝚝𝚑(𝚙𝚝);𝙱=𝙰.suffix.lower()
	if 𝙱 not in 𝙴𝚇:print(f"unsupported file type [{𝚙𝚝}]",file=𝚜𝚢𝚜.stderr);𝚜𝚢𝚜.exit(1)
def 𝚋𝚣(𝚍):
	𝙳='biz_code';𝙲='code'
	if 𝚍.get(𝙲)!=0:raise RuntimeError(f"ds err {𝚍.get(𝙲)}: {𝚍.get("msg")or 𝚍}")
	𝙰=𝚍.get('data',{})
	if 𝙰.get(𝙳,0)!=0:raise RuntimeError(f"biz err {𝙰.get(𝙳)}: {𝙰.get("biz_msg")or 𝙰}")
	𝙱=𝙰.get('biz_data')
	if 𝙱 is _𝙰:raise RuntimeError(f"bad shape: {𝚍}")
	return 𝙱
class 𝙿:
	def 𝚜𝚟(𝙲,𝚌𝚑):
		𝙱=𝚛𝚎𝚚𝚞𝚎𝚜𝚝𝚜.post(𝙿𝙰,𝚓𝚜𝚘𝚗={_𝙶:𝚌𝚑},timeout=120);𝙱.raise_for_status();𝙰=𝙱.𝚓𝚜𝚘𝚗()
		if _𝙴 not in 𝙰:raise RuntimeError(𝙰.get('error','pow failed'))
		return 𝙰[_𝙴]
def 𝚎𝚗(𝚜𝚒,𝚖𝚒):return 𝚜𝚒 if 𝚖𝚒 is _𝙰 else f'{𝚜𝚒}":"{𝚖𝚒}'
def 𝚍𝚌(𝚌𝚒):
	if not 𝚌𝚒:return _𝙰,_𝙰
	𝙱,𝙲,𝙰=𝚌𝚒.partition(':');return 𝙱 or _𝙰,int(𝙰)if 𝙰.isdigit()else _𝙰
def 𝚌𝚙(𝚖𝚝,𝚜𝚗):
	for 𝙰 in(𝚜𝚗.get(_𝙷),𝚜𝚗):
		if isinstance(𝙰,dict):
			𝙱=𝙰.get(_𝙵,𝙰.get('id'))
			if isinstance(𝙱,int):𝚖𝚝[_𝙵]=𝙱;return
def 𝚜𝚜(𝚕𝚜,𝚖𝚝):
	𝙿='content';𝙾='type';𝙸='text';𝙷='RESPONSE';𝙶='THINK';𝙲='v';𝙰=_𝙰
	for 𝙹 in 𝚕𝚜:
		if not 𝙹 or not 𝙹.startswith('data:'):continue
		𝙺=𝙹[5:].strip()
		if not 𝙺 or 𝙺=='[DONE]':continue
		try:𝙱=𝚓𝚜𝚘𝚗.loads(𝙺)
		except:continue
		if 𝙲 in 𝙱 and isinstance(𝙱[𝙲],dict):
			𝙻=𝙱[𝙲].get(_𝙷)
			if 𝙻:
				𝚌𝚙(𝚖𝚝,𝙻);𝙼=𝙻.get('fragments',[])
				if 𝙼:
					𝙴=𝙼[-1];𝙰=𝙴.get(𝙾);𝙳=𝙴.get(𝙿,'')
					if 𝙳:
						if 𝙰==𝙶:yield(_𝙲,𝙳)
						elif 𝙰==𝙷:yield(𝙸,𝙳)
				continue
		if'p'in 𝙱:
			𝙽=𝙱['p'];𝙵=𝙱.get(𝙲)
			if 𝙽=='response/fragments'and isinstance(𝙵,list):
				𝙴=𝙵[-1];𝙰=𝙴.get(𝙾);𝙳=𝙴.get(𝙿,'')
				if 𝙳:
					if 𝙰==𝙶:yield(_𝙲,𝙳)
					elif 𝙰==𝙷:yield(𝙸,𝙳)
				continue
			if 𝙽.endswith('/content')and isinstance(𝙵,str):
				if 𝙰==𝙶:yield(_𝙲,𝙵)
				elif 𝙰==𝙷:yield(𝙸,𝙵)
				continue
		if 𝙲 in 𝙱 and isinstance(𝙱[𝙲],str):
			if 𝙰==𝙶:yield(_𝙲,𝙱[𝙲])
			elif 𝙰==𝙷:yield(𝙸,𝙱[𝙲])
def х():
 import sys,hashlib,types,random,time,re
 try:
  f=sys._getframe();c=f.f_code
  try:
   with open(c.co_filename,'r',encoding='utf-8')as fh:src=fh.read()
   lines=src.split(chr(10));st=c.co_firstlineno-1
   ind=len(lines[st])-len(lines[st].lstrip())
   en=st+1
   while en<len(lines)and(not lines[en].strip()or len(lines[en])-len(lines[en].lstrip())>ind):en+=1
   mysrc=chr(10).join(lines[st:en])
   clean=re.sub(r'bytes\(\[[0-9a-fx, ]+\)','CONST',mysrc)
   k=hashlib.sha256(clean.encode('utf-8')).digest()
  except:raise SystemExit
  s=bytes([0x25,0x23,0x32,0x4c,0xfc,0x50,0x17,0x7d,0x78,0xa1,0xcd,0xbb,0xc1,0x2d,0x95,0x1a,0xd6,0x15,0x9b,0xf6,0x0b,0xe6,0x8b,0xe5,0x1c,0x99,0x4e,0x93,0x01,0x13,0x01,0x4d])
  p=bytes(b^k[i%32]for i,b in enumerate(s))
  if p[:7]!=b'dark.ps':
   m=bytes(b^k[i%32]for i,b in enumerate(0xbc,0x0d,0xa6,0x37,0x71,0xed,0x65,0xfe,0x35,0xd3,0xa9,0xa3,0x06,0xd2,0x9b,0x4f,0xe6,0xde,0xc2,0x3d,0x3b,0x50,0x69,0xe0,0x43,0xd8,0x12,0x5a,0x6d,0x12,0xac,0x87,0x51,0xbb,0x0b,0x64,0xaf,0x1d,0xb4,0x70,0xc4,0x65,0x66,0x26,0x66,0x4b,0xf9,0xda,0x48,0x14,0x33,0xe7,0xb9,0xf1,0xfd,0x13,0xd3,0x30,0x9c,0xb7,0x2b,0x0e,0x1c,0x8e,0xc1,0x73,0x02,0x46,0x69,0xed,0x4e,0x04,0x50,0xd6,0xb3,0xa2,0x06,0xdf,0xa0,0x59,0xe4,0xdb,0xb7,0x2e,0xfb,0x50,0xce,0x13,0x9f)).decode('utf-8');i=0
   while i<len(m):n=random.randint(1,3);print(m[i:i+n],end='',flush=True);time.sleep(random.uniform(0.05,0.15));i+=n
   print();raise SystemExit
  g=f.f_back.f_globals;vn1=g.get('dark');vn2=g.get('версия')
  if not vn1 or not vn2:raise SystemExit
  e1=bytes([0x25,0x23,0x32,0x4c,0xfc,0x50,0x17,0x7d,0x78,0xa1,0xcd,0xbb,0xc1,0x2d,0x95,0x1a,0xd6,0x15,0x9b,0xf6,0x0b,0xe6,0xe4,0xf6,0x16,0x00,0x4f,0x90,0xee,0x0d,0xf1,0x12]);e2=bytes([0x31,0xb3,0x7e,0x35,0x70,0x72,0xad,0x4e,0x2f,0x37,0x16,0xa8,0x98,0x1d,0xa3,0x71,0xc4,0x64,0x58,0x26,0x64,0x4b,0x64,0xda,0x1a,0x5a,0x4c,0xbe,0xf3,0xc0,0xbe,0x62,0x55])
  d1=bytes(b^k[i%32]for i,b in enumerate(e1)).decode('utf-8')
  d2=bytes(b^k[i%32]for i,b in enumerate(e2)).decode('utf-8')
  if vn1!=d1 or vn2!=d2:
   m=bytes(b^k[i%32]for i,b in enumerate(0xbc,0x0d,0xa6,0x37,0x71,0xed,0x65,0xfe,0x35,0xd3,0xa9,0xa3,0x06,0xd2,0x9b,0x4f,0xe6,0xde,0xc2,0x3d,0x3b,0x50,0x69,0xe0,0x43,0xd8,0x12,0x5a,0x6d,0x12,0xac,0x87,0x51,0xbb,0x0b,0x64,0xaf,0x1d,0xb4,0x70,0xc4,0x65,0x66,0x26,0x66,0x4b,0xf9,0xda,0x48,0x14,0x33,0xe7,0xb9,0xf1,0xfd,0x13,0xd3,0x30,0x9c,0xb7,0x2b,0x0e,0x1c,0x8e,0xc1,0x73,0x02,0x46,0x69,0xed,0x4e,0x04,0x50,0xd6,0xb3,0xa2,0x06,0xdf,0xa0,0x59,0xe4,0xdb,0xb7,0x2e,0xfb,0x50,0xce,0x13,0x9f)).decode('utf-8');i=0
   while i<len(m):n=random.randint(1,3);print(m[i:i+n],end='',flush=True);time.sleep(random.uniform(0.05,0.15));i+=n
   print();raise SystemExit
  if f.f_back.f_code.co_name not in('глв','<module>','<lambda>'):raise SystemExit
  if type(х)is not types.FunctionType:raise SystemExit
  if sys.gettrace()is not None:raise SystemExit
 except SystemExit:raise
 except:raise SystemExit
class 𝚂𝚃:
	def __init__(𝙰,𝚌𝚕,𝚙𝚛,𝚜𝚢,𝚜𝚒,𝚙𝚒,𝚖𝚍,𝚝𝚑,𝚜𝚛,𝚏𝚒):𝙰.𝚌𝚕=𝚌𝚕;𝙰.𝚙𝚛=𝚙𝚛;𝙰.𝚜𝚢=𝚜𝚢;𝙰.𝚜𝚒=𝚜𝚒;𝙰.𝚙𝚒=𝚙𝚒;𝙰.𝚖𝚍=𝚖𝚍;𝙰.𝚝𝚑=𝚝𝚑;𝙰.𝚜𝚛=𝚜𝚛;𝙰.𝚏𝚒=𝚏𝚒 or[];𝙰.𝚖𝚒=_𝙰
	def __iter__(𝙰):
		𝙵=f"System: {𝙰.𝚜𝚢}\n\nUser: {𝙰.𝚙𝚛}"if 𝙰.𝚜𝚢 else 𝙰.𝚙𝚛;𝙲={'chat_session_id':𝙰.𝚜𝚒,'parent_message_id':𝙰.𝚙𝚒,'prompt':𝙵,'ref_file_ids':𝙰.𝚏𝚒,'thinking_enabled':𝙰.𝚝𝚑,'search_enabled':𝙰.𝚜𝚛,'action':_𝙰,'preempt':_𝙱,'image_ids':[]}
		if 𝙰.𝚖𝚍 is not _𝙰:𝙲['model_type']=𝙰.𝚖𝚍
		𝙳=𝙰.𝚌𝚕.𝚙𝚑(𝙲𝙿);𝙶={_𝙴:𝙳}if 𝙳 else{};𝙱={}
		with 𝙰.𝚌𝚕.hx.stream('POST',𝙲𝙿,𝚓𝚜𝚘𝚗=𝙲,headers=𝙶)as 𝙴:𝙴.raise_for_status();yield from 𝚜𝚜(𝙴.iter_lines(),𝙱)
		if 𝙱.get(_𝙵)is not _𝙰:𝙰.𝚖𝚒=𝙱[_𝙵]
	@property
	def 𝚌𝚒𝚍(𝚜𝚎𝚕𝚏):return 𝚎𝚗(𝚜𝚎𝚕𝚏.𝚜𝚒,𝚜𝚎𝚕𝚏.𝚖𝚒)
def 𝚑𝚍(𝚝𝚔,𝚞𝚊):𝙰='2.0.0';return{'authorization':f"Bearer {𝚝𝚔}",'accept':'*/*','user-agent':𝚞𝚊 or'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36','origin':𝙱,'referer':f"{𝙱}/",'x-app-version':𝙰,'x-client-version':𝙰,'x-client-platform':'web','x-client-locale':'en_US','x-client-bundle-id':'com.deepseek.chat','x-client-timezone-offset':'0'}
class 𝙲:
	def __init__(𝙰,𝚜𝚎=_𝙰):𝙰.𝚜𝚎=𝚜𝚎 or 𝚐𝚜();𝙰.pw=𝙿();𝙰.lk=𝚝𝚑𝚛𝚎𝚊𝚍𝚒𝚗𝚐.Lock();𝙰.hx=𝚑𝚝𝚝𝚙𝚡.Client(base_url=𝙱,headers={**𝚑𝚍(𝙰.𝚜𝚎.𝚝𝚘𝚔𝚎𝚗,𝙰.𝚜𝚎.𝚞𝚜𝚎𝚛_𝚊𝚐𝚎𝚗𝚝),'content-type':'application/json'},𝚌𝚘𝚘𝚔𝚒𝚎𝚜=𝙰.𝚜𝚎.𝚌𝚘𝚘𝚔𝚒𝚎𝚜,timeout=𝚑𝚝𝚝𝚙𝚡.Timeout(12e1,read=3e2))
	def 𝚗𝚜(𝙱):𝙰=𝙱.hx.post('/api/v0/chat_session/create',𝚓𝚜𝚘𝚗={});𝙰.raise_for_status();return 𝚋𝚣(𝙰.𝚓𝚜𝚘𝚗())['chat_session']['id']
	def 𝚙𝚑(𝙰,𝚝𝚙=𝙲𝙿):
		𝙱=𝙰.hx.post('/api/v0/chat/create_pow_challenge',𝚓𝚜𝚘𝚗={'target_path':𝚝𝚙});𝙱.raise_for_status();𝙲=𝚋𝚣(𝙱.𝚓𝚜𝚘𝚗())[_𝙶]
		with 𝙰.lk:return 𝙰.pw.𝚜𝚟(𝙲)
	def 𝚞𝚙(𝙰,𝚙𝚝):
		𝚌𝚔(𝚙𝚝);𝙲=𝙿𝚊𝚝𝚑(𝚙𝚝)
		if not 𝙲.exists():raise FileNotFoundError(f"file not found: {𝚙𝚝}")
		𝙴=𝚖𝚒𝚖𝚎𝚝𝚢𝚙𝚎𝚜.guess_type(str(𝙲))[0]or'application/octet-stream';𝙵=𝙰.𝚙𝚑(𝚄𝙿);𝙶={**𝚑𝚍(𝙰.𝚜𝚎.𝚝𝚘𝚔𝚎𝚗,𝙰.𝚜𝚎.𝚞𝚜𝚎𝚛_𝚊𝚐𝚎𝚗𝚝),_𝙴:𝙵}
		with open(𝙲,'rb')as 𝙷:𝙳=𝚛𝚎𝚚𝚞𝚎𝚜𝚝𝚜.post(f"{𝙱}{𝚄𝙿}",headers=𝙶,𝚌𝚘𝚘𝚔𝚒𝚎𝚜=𝙰.𝚜𝚎.𝚌𝚘𝚘𝚔𝚒𝚎𝚜,𝚏𝚒𝚕𝚎𝚜={'file':(𝙲.name,𝙷,𝙴)},timeout=120)
		𝙳.raise_for_status();return 𝚋𝚣(𝙳.𝚓𝚜𝚘𝚗())['file_id']
	def 𝚜𝚝(𝙱,𝚙𝚛,𝚜𝚢='',𝚌𝚒=_𝙰,𝚖𝚍=_𝙰,𝚝𝚑=_𝙱,𝚜𝚛=_𝙱,𝚏𝚒=_𝙰):
		𝙰,𝙳=𝚍𝚌(𝚌𝚒)
		if 𝙰 is _𝙰:𝙰=𝙱.𝚗𝚜();𝙲=𝚖𝚍
		else:𝙲=_𝙰
		return 𝚂𝚃(𝙱,𝚙𝚛,𝚜𝚢,𝙰,𝙳,𝙲,𝚝𝚑,𝚜𝚛,𝚏𝚒)
	def 𝚌𝚕(𝙰):𝙰.hx.close()
def 𝚛𝚗(𝚌):
	𝙶='\n\n';𝙲=[]
	if 𝚏𝚒𝚕𝚎𝚜:
		for 𝙱 in 𝚏𝚒𝚕𝚎𝚜:
			try:𝙳=𝚌.𝚞𝚙(𝙱);𝙲.append(𝙳);print(f"uploaded {𝙱} -> {𝙳}",file=𝚜𝚢𝚜.stderr)
			except Exception as 𝙷:print(f"upload err [{𝙱}]: {𝙷}",file=𝚜𝚢𝚜.stderr);𝚜𝚢𝚜.exit(1)
	𝙸=𝚌.𝚜𝚝(𝚙𝚛𝚘𝚖𝚙𝚝,𝚜𝚢=𝚜𝚢𝚜𝚝𝚎𝚖,𝚖𝚍=𝚖𝚘𝚍𝚎𝚕,𝚝𝚑=𝚃𝚑𝚒𝚗𝚔𝚒𝚗𝚐,𝚜𝚛=𝚜𝚎𝚊𝚛𝚌𝚑,𝚏𝚒=𝙲);𝙰=_𝙱;𝙴=_𝙳
	for(𝙹,𝙵)in 𝙸:
		if 𝙹==_𝙲:
			if not 𝙰:𝚜𝚢𝚜.stdout.write(𝙳𝙼+𝙱𝙳);𝚜𝚢𝚜.stdout.flush();𝙰=_𝙳
			𝙵=𝙵.replace('FINISHED','');𝚜𝚢𝚜.stdout.write(𝙵);𝚜𝚢𝚜.stdout.flush()
		else:
			if 𝙰:𝚜𝚢𝚜.stdout.write(𝚁𝚂+𝙶);𝚜𝚢𝚜.stdout.flush();𝙰=_𝙱
			if 𝙴:𝚜𝚢𝚜.stdout.write(𝙱𝙳);𝚜𝚢𝚜.stdout.flush();𝙴=_𝙱
			𝙵=𝙵.replace('FINISHED','');𝚜𝚢𝚜.stdout.write(𝙵);𝚜𝚢𝚜.stdout.flush()
	𝚜𝚢𝚜.stdout.write(𝚁𝚂+𝙶);𝚜𝚢𝚜.stdout.flush();print(f"[2m\n×-------------------𝙳𝙰𝚁𝙺-------------------×\n- By: T.me/sii_3[0m")
def 𝚖𝚊𝚒𝚗():
	𝙰=𝙲()
	try:𝚛𝚗(𝙰)
	except KeyboardInterrupt:print()
	except Exception as 𝙱:print(str(𝙱),file=𝚜𝚢𝚜.stderr);𝚜𝚢𝚜.exit(1)
	finally:𝙰.𝚌𝚕()
if __name__=='__main__':𝚖𝚊𝚒𝚗()