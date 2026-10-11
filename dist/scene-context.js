export const SCENE_CONTEXT={
 opening:{kind:'flashback',title:'THREE NIGHTS EARLIER',place:'Smithson Valley · First outbreak',return:'THREE NIGHTS LATER',object:'The school’s last bell'},
 closet:{kind:'flashback',title:'FLASHBACK · FIRST NIGHT',place:'The survivors’ shelter',return:'BACK TO THE PRESENT',object:'Ethan remembers the closet handle'},
 serum:{kind:'flashback',title:'FLASHBACK · ONE DOSE LATER',place:'The east utility chair',return:'BACK TO THE PRESENT',object:'Ethan remembers Joel’s empty chair'},
 road:{kind:'flashback',title:'FLASHBACK · BEFORE THE SCHOOL',place:'Oak Village North · The morning run',return:'BACK TO THE PRESENT',object:'Landon’s running shoe'},
 seal:{kind:'flashback',title:'FLASHBACK · A ROUTE HOME',place:'The compass store · Paul and Johnson',return:'BACK TO THE PRESENT',object:'The compass and the seal'},
 sacrifice:{kind:'flashback',title:'FLASHBACK · MINUTES EARLIER',place:'The infirmary · Hall’s last promise',return:'BACK TO THE PRESENT',object:'Hall’s discarded syringe'},
 promise:{kind:'premonition',title:'A POSSIBLE FUTURE',place:'Room 204 · The unwritten page',return:'THE PRESENT · THE CHOICE IS STILL YOURS',object:'The blank page in Ethan’s notebook'},
 descent:{kind:'present',title:'CHAPTER II',place:'The Backrooms · Beneath Room 204'},
 return:{kind:'present',title:'CHAPTER III',place:'Smithson Valley · The last night'}
};
export const MEMORY_LEAD_IN=2.35;
export function sceneContext(id){return SCENE_CONTEXT[id]||{kind:'present',title:'',place:''};}
