/* Run on GitHub's runner, where Pages/Actions API access is available.
 * Never unpublish the site or change Pages settings. Only the explicitly
 * identified stuck deployment is eligible for cancellation. */
module.exports=async function repairPages({github,context,core,sha,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 if(!/^[a-f0-9]{40}$/.test(sha||''))throw Error('Provide the full 40-character SHA from the Pages deployment error.');
 const repo=context.repo,log=[];
 async function summary(){await core.summary.addHeading('GitHub Pages repair').addList(log).write();}
 const site=await github.rest.repos.getPages(repo);log.push('Pages build type: '+site.data.build_type+'; status: '+site.data.status);core.info(log.at(-1));
 let deployment;
 try{deployment=(await github.request('GET /repos/{owner}/{repo}/pages/deployments/{deploymentId}',{...repo,deploymentId:sha})).data;}
 catch(e){if(e.status!==404)throw e;log.push('The identified deployment no longer exists.');}
 const terminal=new Set(['succeed','cancelled','canceled','deployment_failed','deployment_content_failed','deployment_cancelled','deployment_lost','deployment_not_found','deployment_timeout']);
 if(deployment){log.push('Identified deployment '+sha+': '+deployment.status);core.info(log.at(-1));if(terminal.has(deployment.status)){log.push('Deployment is already finished; no cancellation requested.');}else{
  await github.request('POST /repos/{owner}/{repo}/pages/deployments/{deploymentId}/cancel',{...repo,deploymentId:sha});log.push('Cancellation requested for the identified deployment.');
  let done=false;for(let i=0;i<12;i++){await wait(5000);try{const result=await github.request('GET /repos/{owner}/{repo}/pages/deployments/{deploymentId}',{...repo,deploymentId:sha});if(terminal.has(result.data.status)){log.push('Deployment reached '+result.data.status+'.');done=true;break;}}catch(e){if(e.status===404){done=true;log.push('Deployment cleared.');break;}throw e;}}
  if(!done){log.push('GitHub still reports the deployment as pending after cancellation; no rerun was started.');await summary();throw Error('Pages cancellation has not completed. Check this run summary and GitHub Pages service status.');}
 }}
 const runs=(await github.rest.actions.listWorkflowRunsForRepo({...repo,per_page:100})).data.workflow_runs;
 const latest=runs.filter(r=>r.name==='pages build and deployment'&&r.head_branch==='main'&&r.head_sha!==sha).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))[0];
 if(!latest){log.push('No managed Pages run found; no unrelated workflow was changed.');}
 else{log.push('Latest managed Pages run: '+latest.html_url+'; '+latest.status+' / '+latest.conclusion);if(latest.status!=='completed'){log.push('Latest run is already queued/running. Let it finish.');}
 else if(latest.conclusion==='failure'||latest.conclusion==='timed_out'){await github.rest.actions.reRunWorkflowFailedJobs({...repo,run_id:latest.id});log.push('Re-ran failed jobs for the latest Pages run.');}
 else if(latest.conclusion==='cancelled'){await github.rest.actions.reRunWorkflow({...repo,run_id:latest.id});log.push('Re-ran the latest cancelled Pages run.');}
 else{log.push('Latest Pages run already succeeded; no rerun needed.');}}
 await summary();for(const line of log)core.info(line);
};
