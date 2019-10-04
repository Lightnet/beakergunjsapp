<script>
    import { onMount, afterUpdate, onDestroy, createEventDispatcher } from 'svelte';
    import FileDataComponent from './component/FileDataComponent.svelte';
    let idcomponet = "main";

    onMount(() => {

    });

    onDestroy(() => {

    });

    async function UserSession(){

        
        //experimental.datPeers.setSessionData({
            //name: 'Bob',
            //url: 'dat://1234..56'
        //});


    }

</script>

<style>

</style>

<div id={idcomponet}>
    <FileDataComponent></FileDataComponent>
</div>