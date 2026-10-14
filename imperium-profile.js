/* Addresses verified against the user's Imperium v1.3.1 SHA-256, not generic BPEE offsets. */
const ImperiumProfile={id:'imperium-1.3.1',sha256:'79bfd6266f7980452c864a20ffe47783b8bb91ec9957174ed416b77d3facb3a0',
 tables:{items:{start:0x6c7ac8,stride:80,count:858,nameCapacity:20,pluralField:20,pluralCapacity:22,descriptionField:-8},abilities:{start:0x7134bc,stride:28,count:327,nameCapacity:19,descriptionField:20},moves:{start:0x704aa8,stride:52,count:937,nameField:0,descriptionField:4}},
 fonts:[{id:1,glyphs:0x664350,widths:0x66c350,height:15},{id:7,glyphs:0x653f50,widths:0x65bf50,height:15},{id:2,glyphs:0x65c150,widths:0x664150,height:14},{id:0,glyphs:0x64bd50,widths:0x653d50,height:12}],
 nameTables:{pokemon:{start:0xd5db08,stride:260,count:1434,capacity:13},trainers:{start:0x54facb,stride:120,count:860,capacity:12},classes:{start:0x4eb108,stride:16,count:66,capacity:16}},
 menuTables:[{start:0xdeb404,stride:8,count:14},{start:0x6de4f4,stride:8,count:12}],
 pool:{start:0x1d00000,end:0x2000000},menuNames:['New Game','Continue','Option','Options','Pokédex','Pokémon','Bag','Save','Exit','Cancel','Yes','No','Summary','Switch','Item','Give','Take','Toss','Use','Check','Choose','Quit','Register','Deselect','Moves','Ability','Abilities','Fight','Run','Back','Next','Start','Confirm','Time','Play Time'],
 introOffsets:[0x388deb],version:'1.3.1'};
if(typeof module!=='undefined')module.exports=ImperiumProfile;
