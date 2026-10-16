"""Execute the pinned ROM's move-description consumers; graphics endpoints are mocked."""
import json,struct,sys
from pathlib import Path
from unicorn import Uc,UC_ARCH_ARM,UC_MODE_THUMB,UC_HOOK_CODE
from unicorn.arm_const import *
rom=bytearray(Path(sys.argv[1]).read_bytes());meta=json.loads(Path(sys.argv[2]).read_text());ROM=0x08000000
u=Uc(UC_ARCH_ARM,UC_MODE_THUMB);u.mem_map(ROM,0x2000000);u.mem_write(ROM,bytes(rom));u.mem_map(0x02000000,0x40000);u.mem_map(0x03000000,0x8000)
word=lambda at:struct.unpack_from('<I',rom,at)[0]
readword=lambda at:struct.unpack('<I',u.mem_read(at,4))[0]
reg=lambda r:u.reg_read(r)
state=0x02001000;stack=0x03007000;stop=0x03000100
capture=[];format_calls=[];trace=[]
def string_at(at):
 data=bytearray()
 for n in range(1000):
  v=u.mem_read(at+n,1)[0];data.append(v)
  if v==255:return bytes(data)
 raise AssertionError('No EOS within buffer')
def hook(uc,at,size,unused):
 trace.append(hex(at));trace[:]=trace[-16:]
 if at==stop:uc.emu_stop();return
 if at==ROM+0xe0f78:format_calls.append(at)
 if at in {ROM+x for x in [0x245960,0x2459e4,0x218a14,0xdd484,0x2455c8,0x177bd8,0x21844c]}:
  uc.reg_write(UC_ARM_REG_R0,0);uc.reg_write(UC_ARM_REG_PC,reg(UC_ARM_REG_LR));return
 if at==ROM+0x178160:
  capture.append(string_at(readword(reg(UC_ARM_REG_SP)+16)));uc.reg_write(UC_ARM_REG_R0,0);uc.reg_write(UC_ARM_REG_PC,reg(UC_ARM_REG_LR))
 if at==ROM+0x216af4:
  capture.append(string_at(reg(UC_ARM_REG_R2)));uc.reg_write(UC_ARM_REG_R0,0);uc.reg_write(UC_ARM_REG_PC,reg(UC_ARM_REG_LR))
u.hook_add(UC_HOOK_CODE,hook)
move_base=word(0xdfae0)-ROM

def run(entry,effect,expected=None):
 capture.clear();format_calls.clear();u.mem_write(0x02000000,bytes(0x40000));u.mem_write(0x03000000,bytes([0xa5])*0x8000)
 move=next(i for i in range(1,894)if rom[move_base+i*52]==effect)
 u.mem_write(word(0xdfad4),struct.pack('<I',state));u.mem_write(word(0xdfc0c),struct.pack('<I',state));u.mem_write(state+0x84,struct.pack('<H',move));u.mem_write(state+word(0xdfadc),b'\x01');u.mem_write(state+word(0xdfc10),b'\x01')
 u.reg_write(UC_ARM_REG_SP,stack);u.reg_write(UC_ARM_REG_LR,stop|1);u.reg_write(UC_ARM_REG_R0,0 if entry==0xdfa4c else move)
 for r in range(4,9):u.reg_write(UC_ARM_REG_R0+r,0x11110000+r)
 try:u.emu_start(ROM+entry+1,stop,count=100000)
 except Exception:
  print("ARM trace",trace,"PC",hex(reg(UC_ARM_REG_PC)),"SP",hex(reg(UC_ARM_REG_SP)));raise
 assert reg(UC_ARM_REG_PC)==stop,hex(reg(UC_ARM_REG_PC));assert reg(UC_ARM_REG_SP)==stack
 for r in range(4,9):assert reg(UC_ARM_REG_R0+r)==0x11110000+r,('saved register overwritten',r)
 assert len(capture)==1,capture
 if expected is not None:assert capture[0]==expected,(entry,len(capture[0]),len(expected));assert not format_calls,'Translated text was reparsed by the byte-splitting formatter'
 else:assert format_calls,'Original text must retain its original formatter'

for entry in [0xdfa4c,0xdfaf0]:run(entry,meta['effect'],bytes(meta['encoded']))
# The full 256-byte limit, including a font-0 argument (zero), spaces and newlines.
maximum=bytes([252,6,0])+bytes([249,24,0,249,25,254])*42+b'\xff'
assert len(maximum)==256
u.mem_write(meta['pointer'],maximum)
for entry in [0xdfa4c,0xdfaf0]:run(entry,meta['effect'],maximum)
u.mem_write(meta['pointer'],bytes(rom[meta['pointer']-ROM:meta['pointer']-ROM+256]))
other=next(i for i in range(48)if i!=meta['effect'] and any(rom[move_base+n*52]==i for n in range(1,894)))
for entry in [0xdfa4c,0xdfaf0]:run(entry,other)
# The advisory consumer loads the relocated pointer directly into native r2.
u.mem_write(0x02000000,bytes(0x40000));u.mem_write(0x03000000,bytes(0x8000));u.mem_write(word(0x143954),b'\x01');capture.clear();u.reg_write(UC_ARM_REG_R0,10);u.reg_write(UC_ARM_REG_R1,meta['advisoryIndex']);u.reg_write(UC_ARM_REG_SP,stack);u.reg_write(UC_ARM_REG_LR,stop|1);u.emu_start(ROM+0x14390d,stop,count=10000);assert capture==[bytes(meta['advisoryEncoded'])];assert reg(UC_ARM_REG_SP)==stack
print('PASS actual ARM consumers: both contest paths, exact Thai bytes, full 256-byte boundary, font-0 codes, preserved saved registers/SP, original formatter fallback, and relocated advisory pointer.')
