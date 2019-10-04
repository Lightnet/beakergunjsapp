<script>
    import { onMount, afterUpdate, onDestroy, createEventDispatcher } from 'svelte';

    let idcomponet = "main";
    let userprofile;

    function GetCheckUser(){
        let user = window.localStorage.getItem('user');
        console.log(user);
        if(user !=null){
            userprofile = new DatArchive(user);
        }        
    }

    function SetCheckUser(data){
        window.localStorage.setItem('user',data.url);
    }

    onMount(() => {
        experimental.datPeers.addEventListener('session-data', ({peer}) => {
            console.log(peer.id, 'has set their session data to', peer.sessionData)
        });
        console.log("mount");
        //window.localStorage.setItem('user', JSON.stringify(person));
        GetCheckUser();
    });

    onDestroy(() => {

    });

    async function SelectUser(){
        console.log("select?");
        var archive = await DatArchive.selectArchive({
            title: 'Select an archive to use as your user profile',
            buttonLabel: 'Select profile',
            filters: {
                isOwner: true,
                type: 'gun-profile'
            }
        }).then(value => {
            // fulfillment
            console.log("pass!",value);
            userprofile = value;
            console.log(value);
            SetCheckUser(userprofile);

        }, reason => {
            // rejection
            console.log("fail!");
        });
    }

    async function CreateUser(){
        console.log("create?");
        var archive = await DatArchive.create({
            title: 'gun user',
            description:"user profile",
            type:["gun-profile"]
        }).then(async value => {
            // fulfillment
            console.log("pass!",value);
            userprofile = value;
            console.log(userprofile);
            await userprofile.mkdir('/posts');
            await userprofile.mkdir('/config');
        }, reason => {
            // rejection
            console.log("fail!");
        });
    }

    async function UserWrite(){
        console.log(userprofile);
        if(userprofile !=null){
            //var st = userprofile.stat('/test.md');
            //console.log(st.isFile());
            var str = "hello world";

            await userprofile.writeFile('/test.md', str, 'utf8');

            //await archive.mkdir('/stuff')
            //await archive.writeFile('/hello.txt', str, 'utf8')
            //await archive.writeFile('/beaker.png', pngBase64, 'base64')
            console.log("write");
        }
    }

    async function UserRead(){

        if(userprofile !=null){
            var st = await userprofile.stat('/test.md');
            console.log(st)
            console.log(st.isFile());

            //await userprofile.readFile('/test.md', 'utf8')
            //await userprofile.readFile('/img/logo/logo.png', 'binary')
            console.log("read");
        }
    }

    async function UserFolder(){
        if(userprofile !=null){
            console.log("UserFolder");
            var st = await userprofile.stat('/posts');
            if(st.isDirectory()){
                console.log("folder")
            }else{
                //await userprofile.mkdir('/stuff');
                console.log("not")
            }
            
            //var str = "hello world";
            //await userprofile.writeFile('/test.md', str, 'utf8');            
        }
    }

    async function UserSessionSet(){
        console.log(userprofile);
        var info = await userprofile.getInfo();

        experimental.datPeers.setSessionData({
            name: info.title,
            url: userprofile.url//'dat://1234..56'
        });
    }

    async function UserSessionGet(){
        
    }

    async function PeerList(){
        var peers = await experimental.datPeers.list()
        console.log(peers);

        //for(){}
            //peers[..].id // string
            //peers[..].sessionData // object
        //}
    }


</script>

<style>

</style>

<div id={idcomponet}>
    Hello World! 
    <button on:click={CreateUser}> Create User </button>
    <button on:click={SelectUser}> Select User </button>

    <button on:click={UserWrite}> User Write </button>
    <button on:click={UserRead}> User Read </button>
    <button on:click={UserFolder}> User Folder Test </button>

    <button on:click={UserSessionSet}> UserSessionSet </button>
    <button on:click={PeerList}> PeerList </button>
</div>