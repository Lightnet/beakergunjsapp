(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define('cliententrypoint', factory) :
    (global = global || self, global.cliententrypoint = factory());
}(this, function () { 'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    /* src\client\component\FileDataComponent.svelte generated by Svelte v3.12.1 */

    function create_fragment(ctx) {
    	var div, t0, button0, t2, button1, t4, button2, t6, button3, t8, button4, t10, button5, t12, button6, dispose;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("Hello World! \r\n    ");
    			button0 = element("button");
    			button0.textContent = "Create User";
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "Select User";
    			t4 = space();
    			button2 = element("button");
    			button2.textContent = "User Write";
    			t6 = space();
    			button3 = element("button");
    			button3.textContent = "User Read";
    			t8 = space();
    			button4 = element("button");
    			button4.textContent = "User Folder Test";
    			t10 = space();
    			button5 = element("button");
    			button5.textContent = "UserSessionSet";
    			t12 = space();
    			button6 = element("button");
    			button6.textContent = "PeerList";
    			attr(div, "id", idcomponet);

    			dispose = [
    				listen(button0, "click", ctx.CreateUser),
    				listen(button1, "click", ctx.SelectUser),
    				listen(button2, "click", ctx.UserWrite),
    				listen(button3, "click", ctx.UserRead),
    				listen(button4, "click", ctx.UserFolder),
    				listen(button5, "click", ctx.UserSessionSet),
    				listen(button6, "click", PeerList)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, button0);
    			append(div, t2);
    			append(div, button1);
    			append(div, t4);
    			append(div, button2);
    			append(div, t6);
    			append(div, button3);
    			append(div, t8);
    			append(div, button4);
    			append(div, t10);
    			append(div, button5);
    			append(div, t12);
    			append(div, button6);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			run_all(dispose);
    		}
    	};
    }

    let idcomponet = "main";

    function SetCheckUser(data){
        window.localStorage.setItem('user',data.url);
    }

    async function PeerList(){
        var peers = await experimental.datPeers.list();
        console.log(peers);

        //for(){}
            //peers[..].id // string
            //peers[..].sessionData // object
        //}
    }

    function instance($$self) {
    	
        let userprofile;

        function GetCheckUser(){
            let user = window.localStorage.getItem('user');
            console.log(user);
            if(user !=null){
                userprofile = new DatArchive(user);
            }        
        }

        onMount(() => {
            experimental.datPeers.addEventListener('session-data', ({peer}) => {
                console.log(peer.id, 'has set their session data to', peer.sessionData);
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
                console.log(st);
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
                    console.log("folder");
                }else{
                    //await userprofile.mkdir('/stuff');
                    console.log("not");
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

    	return {
    		SelectUser,
    		CreateUser,
    		UserWrite,
    		UserRead,
    		UserFolder,
    		UserSessionSet
    	};
    }

    class FileDataComponent extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    	}
    }

    /* src\client\App.svelte generated by Svelte v3.12.1 */

    function create_fragment$1(ctx) {
    	var div, current;

    	var filedatacomponent = new FileDataComponent({});

    	return {
    		c() {
    			div = element("div");
    			filedatacomponent.$$.fragment.c();
    			attr(div, "id", idcomponet$1);
    		},

    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(filedatacomponent, div, null);
    			current = true;
    		},

    		p: noop,

    		i(local) {
    			if (current) return;
    			transition_in(filedatacomponent.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(filedatacomponent.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			destroy_component(filedatacomponent);
    		}
    	};
    }

    let idcomponet$1 = "main";

    function instance$1($$self) {
    	

        onMount(() => {

        });

        onDestroy(() => {

        });

    	return {};
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    	}
    }

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

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'MJS'
    	}
    });

    return app;

}));
