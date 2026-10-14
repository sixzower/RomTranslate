#include <mgba/core/core.h>
#include <mgba-util/vfs.h>
#include <mgba/internal/arm/arm.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
static void ppm(const char *path, uint32_t *pixels){FILE*f=fopen(path,"wb");if(!f)exit(4);fprintf(f,"P6\n240 160\n255\n");for(int i=0;i<240*160;i++){uint8_t c[3]={pixels[i]&255,(pixels[i]>>8)&255,(pixels[i]>>16)&255};fwrite(c,1,3,f);}fclose(f);}
int main(int argc,char**argv){if(argc<2)return 2;struct mCore*c=mCoreCreate(mPLATFORM_GBA);if(!c||!c->init(c))return 3;mCoreInitConfig(c,NULL);mCoreConfigSetDefaultIntValue(&c->config,"skipBios",1);mCoreConfigSetDefaultIntValue(&c->config,"useBios",0);c->loadConfig(c,&c->config);uint32_t *pixels=calloc(240*160,4);c->setVideoBuffer(c,pixels,240);struct VFile*vf=VFileOpen(argv[1],O_RDONLY);if(!vf||!c->loadROM(c,vf))return 5;c->reset(c);if(argc>2){FILE*f=fopen(argv[2],"rb");if(!f)return 6;void*s=malloc(c->stateSize(c));fread(s,1,c->stateSize(c),f);fclose(f);if(!c->loadState(c,s))return 7;free(s);}unsigned frames,keys;char out[1024];while(scanf("%u %u %1023s",&frames,&keys,out)==3){c->setKeys(c,keys);for(unsigned i=0;i<frames;i++)c->runFrame(c);ppm(out,pixels);char state[1100];snprintf(state,sizeof(state),"%s.state",out);void*s=malloc(c->stateSize(c));c->saveState(c,s);FILE*f=fopen(state,"wb");fwrite(s,1,c->stateSize(c),f);fclose(f);free(s);fprintf(stderr,"frame %u pc=%08x screenshot %s\n",c->frameCounter(c),((struct ARMCore*)c->cpu)->gprs[15],out);}c->deinit(c);free(pixels);return 0;}
