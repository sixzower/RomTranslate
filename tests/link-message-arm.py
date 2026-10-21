"""Exercise the actual link-message wrapper and placeholder copier, with graphics mocked."""
import json,struct,sys
from pathlib import Path
from unicorn import Uc,UC_ARCH_ARM,UC_MODE_THUMB,UC_HOOK_CODE
from unicorn.arm_const import *
rom=Path(sys.argv[1]).read_bytes();data=json.loads(Path(sys.argv[2]).read_text());ROM=0x08000000;scratch=0x0203ebdc;stop=0x03000100;stack=0x03007000
u=Uc(UC_ARCH_ARM,UC_MODE_THUMB);u.mem_map(ROM,0x2000000);u.mem_write(ROM,rom);u.mem_map(0x02000000,0x40000);u.mem_map(0x03000000,0x8000)
word=lambda at:struct.unpack_from('<I',rom,at)[0]
state=word(0x138db8);captures=[];copyCalls=[]
def hook(uc,at,size,unused):
 if at==stop:uc.emu_stop();return
 if at==ROM+0x2162dc:copyCalls.append((uc.reg_read(UC_ARM_REG_R0),uc.reg_read(UC_ARM_REG_R1)))
 if at==ROM+0x175004:
  out=bytearray()
  for i in range(1000):
   v=uc.mem_read(scratch+i,1)[0];out.append(v)
   if v==255:break
  else:raise AssertionError('No terminator in native message buffer')
  captures.append(bytes(out));uc.reg_write(UC_ARM_REG_PC,uc.reg_read(UC_ARM_REG_LR));return
 if at==ROM+0x2167fc:uc.reg_write(UC_ARM_REG_PC,uc.reg_read(UC_ARM_REG_LR))
u.hook_add(UC_HOOK_CODE,hook)
def run(expected,initial=0):
 captures.clear();copyCalls.clear();u.mem_write(0x02000000,bytes(0x40000));u.mem_write(scratch,bytes([0xa5])*1004);u.mem_write(state,bytes([initial]));u.mem_write(0x03000000,bytes([0xa5])*0x8000)
 for n in range(4,12):u.reg_write(UC_ARM_REG_R0+n,0x11110000+n)
 u.reg_write(UC_ARM_REG_SP,stack);u.reg_write(UC_ARM_REG_LR,stop|1);u.reg_write(UC_ARM_REG_R0,data['pointer']);u.emu_start(ROM+0x138d8d,stop,count=20000)
 assert u.reg_read(UC_ARM_REG_PC)==stop;assert u.reg_read(UC_ARM_REG_SP)==stack
 for n in range(4,12):assert u.reg_read(UC_ARM_REG_R0+n)==0x11110000+n
 if initial:
  assert not captures and not copyCalls;assert u.reg_read(UC_ARM_REG_R0)==0
 else:
  assert captures==[expected];assert copyCalls==[(scratch,data['pointer'])];assert u.mem_read(scratch+len(expected),4)==bytes([0xa5])*4;assert u.reg_read(UC_ARM_REG_R0)==1
run(bytes(data['encoded']));run(bytes(data['encoded']),3)
maximum=bytes([252,6,0])+bytes([249,24,0,249,25,251])*42+b'\xff';assert len(maximum)==256
u.mem_write(data['pointer'],maximum);run(maximum)
print('PASS native link wrapper + placeholder expansion: exact 96-byte Thai/control text, guarded 256-byte font-0 payload, unchanged busy behavior, terminator/canary and saved registers/stack.')
