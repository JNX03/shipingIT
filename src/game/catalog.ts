import type { StageId } from './types';

export const gameStages: {id:StageId;title:string;verb:string;subtitle:string;reward:string;color:string}[]=[
  {id:'explore',title:'Find the story',verb:'Explore',subtitle:'Meet people. Ask better questions.',reward:'Field notes collected!',color:'#287BE8'},
  {id:'insight',title:'Connect the clues',verb:'Insight',subtitle:'Turn what you heard into a useful insight.',reward:'Insight found!',color:'#9D57D9'},
  {id:'scope',title:'Pack your MVP',verb:'Scope',subtitle:'Choose what fits. Leave the extras behind.',reward:'MVP packed!',color:'#139E8E'},
  {id:'design',title:'Make it feel right',verb:'Design',subtitle:'Build a screen with your own hands.',reward:'Design ready!',color:'#D85795'},
  {id:'connect',title:'Bring it to life',verb:'Connect',subtitle:'Connect the actions behind your screen.',reward:'Your app works!',color:'#5473DA'},
  {id:'launch',title:'Test it. Ship it.',verb:'Ship',subtitle:'Watch people try it. Fix what gets in the way.',reward:'You shipped it!',color:'#E08B16'},
];
export const gameStageById=(id:string)=>gameStages.find(stage=>stage.id===id);
