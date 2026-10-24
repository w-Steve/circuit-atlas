import {expect,type Page} from '@playwright/test';
/** Follow the same parent controls as a user; never jump over the new hierarchy. */
export async function returnToWorld(page:Page){
 for(let depth=0;depth<4;depth++){
  const back=page.getByRole('button',{name:/^返回(观赛|选点|赛道地图|世界地图)$/,exact:true});
  const label=await back.getAttribute('aria-label');await back.click();
  if(label==='返回世界地图'){await expect(page.locator('.world-map')).toBeVisible();return}
 }
 throw new Error('Could not return through the circuit hierarchy');
}
