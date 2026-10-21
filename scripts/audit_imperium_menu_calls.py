"""Read-only discovery of pinned-ROM menu text arguments (optional capstone dependency).
No ROM bytes or decoded source text are written to the repository.
"""
from pathlib import Path
from capstone import Cs,CS_ARCH_ARM,CS_MODE_THUMB
from capstone.arm import ARM_OP_MEM,ARM_REG_PC,ARM_OP_IMM,ARM_REG_R0,ARM_REG_R1,ARM_REG_R2,ARM_REG_R3
import struct,json,hashlib,sys
if len(sys.argv)<2:raise SystemExit('Pass the original Imperium ROM and optional /tmp/report.json')
b=Path(sys.argv[1]).read_bytes()
if hashlib.sha256(b).hexdigest()!='79bfd6266f7980452c864a20ffe47783b8bb91ec9957174ed416b77d3facb3a0':raise SystemExit('Requires the exact verified source ROM')
md=Cs(CS_ARCH_ARM,CS_MODE_THUMB);md.detail=True;md.skipdata=True
out=[]
# Verified text parameters: native AddTextPrinterParameterized (r2), menu/party
# printer wrappers, save/gift printer and link-message printer. Not arbitrary LDRs.
printers={0x216af4:2,0x1758f4:1,0x15bf64:2,0x15fee8:2,0x174fac:2,0x18082c:0,0x138d8c:0}
for pos in range(0,0x280000-4,2):
 a,z=struct.unpack_from('<HH',b,pos)
 if a&0xf800!=0xf000 or z&0xf800!=0xf800:continue
 d=((a&0x7ff)<<12)|((z&0x7ff)<<1)
 if d&0x400000:d-=0x800000
 target=pos+4+d
 if target not in printers:continue
 regs={};sites={}
 for i in md.disasm(b[max(0,pos-24):pos],0x8000000+max(0,pos-24)):
  if i.id==0:regs={};sites={};continue
  o=i.operands
  if i.mnemonic=='ldr' and len(o)==2 and o[1].type==ARM_OP_MEM and o[1].mem.base==ARM_REG_PC:
   s=((i.address+4)&~3)+o[1].mem.disp-0x8000000
   if 0<=s<len(b)-3:regs[o[0].reg]=struct.unpack_from('<I',b,s)[0];sites[o[0].reg]=s
  elif i.mnemonic in ('mov','movs') and len(o)==2:
   regs[o[0].reg]=o[1].imm if o[1].type==ARM_OP_IMM else regs.get(o[1].reg);sites[o[0].reg]=sites.get(o[1].reg)
  elif i.mnemonic.startswith('b') or i.mnemonic in ('pop','push'):regs={};sites={}
  else:
   for r in i.regs_access()[1]:regs.pop(r,None);sites.pop(r,None)
 for num,reg in enumerate([ARM_REG_R0,ARM_REG_R1,ARM_REG_R2,ARM_REG_R3]):
  offset=(regs.get(reg) or 0)-0x8000000
  if printers[target]==num and 192<=offset<len(b) and sites.get(reg):out.append({'offset':offset,'site':sites[reg],'call':pos,'printer':target,'arg':num,'registers':[regs.get(r) for r in [ARM_REG_R0,ARM_REG_R1,ARM_REG_R2,ARM_REG_R3]]})
if len(sys.argv)>2:Path(sys.argv[2]).write_text(json.dumps(out,indent=2))
print('C menu text references:',len(out),'targets:',len({r['offset'] for r in out}))
