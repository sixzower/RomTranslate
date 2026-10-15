"""Inspect pinned-ROM Thumb references without modifying ROM or repository.
Usage: python3 scripts/audit_imperium_c_dialogue.py ORIGINAL.gba [/tmp/report.json]
Optional research dependency: capstone (not required by the site or bundler).
Candidates still need the core decoder and screen checks before profile inclusion.
"""
from pathlib import Path
from capstone import Cs,CS_ARCH_ARM,CS_MODE_THUMB
from capstone.arm import ARM_OP_MEM,ARM_REG_PC,ARM_OP_IMM,ARM_REG_R0,ARM_REG_R1
import hashlib,json,struct,sys
if len(sys.argv)<2:raise SystemExit(__doc__)
b=Path(sys.argv[1]).read_bytes()
sha='79bfd6266f7980452c864a20ffe47783b8bb91ec9957174ed416b77d3facb3a0'
if hashlib.sha256(b).hexdigest()!=sha:raise SystemExit('Requires the verified original Imperium v1.3.1 ROM')
md=Cs(CS_ARCH_ARM,CS_MODE_THUMB);md.detail=True;result=[]
for pos in range(0,len(b)-4,2):
 first,second=struct.unpack_from('<HH',b,pos)
 if first&0xf800!=0xf000 or second&0xf800!=0xf800:continue
 delta=((first&0x7ff)<<12)|((second&0x7ff)<<1)
 if delta&0x400000:delta-=0x800000
 if pos+4+delta!=0x2162dc:continue # StringExpandPlaceholders
 registers={};sites={}
 for ins in md.disasm(b[max(0,pos-24):pos],0x8000000+max(0,pos-24)):
  operands=ins.operands
  if ins.mnemonic=='ldr' and len(operands)==2 and operands[1].type==ARM_OP_MEM and operands[1].mem.base==ARM_REG_PC:
   site=((ins.address+4)&~3)+operands[1].mem.disp-0x8000000
   if 0<=site<len(b)-3:registers[operands[0].reg]=struct.unpack_from('<I',b,site)[0];sites[operands[0].reg]=site
  elif ins.mnemonic in ('mov','movs') and len(operands)==2:
   dst,src=operands;registers[dst.reg]=src.imm if src.type==ARM_OP_IMM else registers.get(src.reg);sites[dst.reg]=sites.get(src.reg)
  elif ins.mnemonic.startswith('b') or ins.mnemonic in ('pop','push'):registers={};sites={}
  else:
   _,writes=ins.regs_access()
   for reg in writes:registers.pop(reg,None);sites.pop(reg,None)
 if registers.get(ARM_REG_R0)!=0x203ebdc or not registers.get(ARM_REG_R1) or not sites.get(ARM_REG_R1):continue
 offset=registers[ARM_REG_R1]-0x8000000
 if not 192<=offset<len(b):continue
 for ins in md.disasm(b[pos+4:pos+36],0x8000000+pos+4):
  if ins.mnemonic=='bl':
   printer=int(ins.op_str.removeprefix('#'),16)-0x8000000
   if printer in [0x175004,0x175078,0x1758f4,0x1907f0]:result.append({'offset':offset,'site':sites[ARM_REG_R1],'expandCall':pos,'printer':printer})
   break
  if ins.mnemonic.startswith('b'):break
report={'romSHA256':sha,'candidates':result,'note':'Only decodable English candidates are included in the app profile. These addresses are not source ROM bytes.'}
if len(sys.argv)>2:Path(sys.argv[2]).write_text(json.dumps(report,indent=2))
print('Message-box candidate references:',len(result),'unique targets:',len({r['offset'] for r in result}))
