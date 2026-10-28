import {SAVE_KEY,validateSave} from './simulation.js';

export class SaveConflictError extends Error {constructor(){super('存档已在另一个窗口改变');this.name='SaveConflictError';}}
export function writeSave(storage,next,expectedRaw){
  if(!validateSave(next))throw new Error('存档未通过检查');
  if(storage.getItem(SAVE_KEY)!==expectedRaw)throw new SaveConflictError();
  const raw=JSON.stringify(next);storage.setItem(SAVE_KEY,raw);return raw;
}

export function parseSave(raw){
  if(typeof raw!=='string'||raw.length>2_000_000)throw new Error('存档为空或过大');
  const state=JSON.parse(raw);
  if(!validateSave(state))throw new Error('存档未通过检查');
  return state;
}

// Keep the recovery source intact until the active save has been written successfully.
export function replaceSave(storage,current,next,backupKey=`${SAVE_KEY}-previous`,expectedRaw){
  if(!validateSave(next))throw new Error('存档未通过检查');
  const raw=storage.getItem(SAVE_KEY);
  if(expectedRaw!==undefined&&raw!==expectedRaw)throw new SaveConflictError();
  let unreadable=false;
  if(raw!==null){try{parseSave(raw);}catch{unreadable=true;}}
  if(unreadable){
    const old=storage.getItem(`${SAVE_KEY}-unreadable`);
    const archiveKey=old!==null&&old!==raw?`${SAVE_KEY}-unreadable-${Date.now()}`:`${SAVE_KEY}-unreadable`;
    storage.setItem(archiveKey,raw);
  }else{
    if(!validateSave(current))throw new Error('当前世界无法安全备份');
    storage.setItem(backupKey,JSON.stringify(current));
  }
  writeSave(storage,next,raw);
  return next;
}
