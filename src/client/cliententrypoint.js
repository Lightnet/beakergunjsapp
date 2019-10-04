/*
const button = document.getElementById('btntest');
//const DatArchive = require('node-dat-archive');
//require('./test');
function btntest(){
    console.log('hello world!');
}
button.addEventListener('click', btntest);
//var mySite = await DatArchive.create({title: 'My site'});
//console.log(mySite.url);
console.log(window.location.origin);
console.log(window.location);
(async function(){
    var archive = new DatArchive(window.location.origin);
    var info = await archive.getInfo();
    console.log(info.title);
    console.log(info.type); // array of strings
    console.log(info.isOwner);
    console.log(info.peers ); 
    //await DatArchive.selectArchive({
        //prompt: 'Select an archive',
        //buttonLabel: 'Accept'
      //})
}());
*/
import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		name: 'MJS'
	}
});
export default app;