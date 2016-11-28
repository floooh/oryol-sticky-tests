define(["require", "exports", './mesh_loader', './game_entity'], function (require, exports, mesh_loader_1, game_entity_1) {
    "use strict";
    class YouzuDemo {
        constructor() {
            this.entities = new Map();
            this.displayWidth = 1100;
            this.displayHeight = 600;
            // game
            this.processedHandshake = false;
            let connectButton = document.getElementById("connect_button");
            connectButton.onclick = () => {
                this.setup();
            };
        }
        setup() {
            console.log("Starting Youzu Babylon Prototype.");
            let canvas = document.getElementById('canvas');
            this.resizeCanvas(canvas);
            this.canvasBoundingRect = canvas.getBoundingClientRect();
            this.engine = new BABYLON.Engine(canvas, true);
            this.scene = new BABYLON.Scene(this.engine);
            let camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 50, -100), this.scene);
            camera.setTarget(BABYLON.Vector3.Zero());
            camera.attachControl(canvas, false);
            let light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), this.scene);
            let ground = BABYLON.Mesh.CreateGround('ground', 100, 100, 2, this.scene);
            this.connectWs();
            this.engine.runRenderLoop(this.render.bind(this));
            this.scene.beforeRender = this.update.bind(this);
            window.addEventListener('click', this.onClick.bind(this));
        }
        resizeCanvas(canvas) {
            canvas.style.width = this.displayWidth + "px";
            canvas.style.height = this.displayHeight + "px";
            let devicePixelRatio = window.devicePixelRatio || 1;
            canvas.width = this.displayWidth * devicePixelRatio;
            canvas.height = this.displayHeight * devicePixelRatio;
        }
        connectWs() {
            this.ip_elem = document.getElementById('ip_field');
            this.port_elem = document.getElementById('port_field');
            let ip = this.ip_elem.value;
            let port = this.port_elem.value;
            let addr = 'ws://' + ip + ':' + port;
            this.socket = new WebSocket(addr);
            this.socket.onopen = this.onOpen.bind(this);
            this.socket.onmessage = this.onMessage.bind(this);
        }
        render() {
            this.scene.render();
        }
        update() {
            let dt = this.scene.getLastFrameDuration() / 100; // into seconds.
            // console.log("dt: " + dt);
            this.entities.forEach((g, id) => {
                g.update(dt);
            });
        }
        onClick(e) {
            let clickOnCanvas = { x: e.clientX - this.canvasBoundingRect.left, y: e.clientY - this.canvasBoundingRect.top };
            let pickResult = this.scene.pick(clickOnCanvas.x, clickOnCanvas.y);
            if (pickResult.pickedMesh === null)
                return;
            if (pickResult.pickedMesh.name == "ground") {
                let moveMsg = {
                    cmd: "move",
                    payload: { pos: [pickResult.pickedPoint.x, pickResult.pickedPoint.z] }
                };
                this.socket.send(JSON.stringify(moveMsg));
            }
            else {
                if (pickResult.pickedMesh.parent === null)
                    return;
                // brute-forcy and ugly, but will do.
                this.entities.forEach((g, k) => {
                    if (g.getAnimatedMesh().mesh.name == pickResult.pickedMesh.parent.name) {
                        let attackMsg = {
                            cmd: "attack",
                            payload: { id: g.getId() }
                        };
                        console.log("attack: " + pickResult.pickedMesh.parent.name + "!");
                        this.socket.send(JSON.stringify(attackMsg));
                    }
                });
            }
        }
        onOpen() {
            console.log("Server connection established!");
            this.ip_elem.value = "Score:";
            this.port_elem.value = "0";
        }
        onMessage(data) {
            let reader = new FileReader();
            reader.onload = (event) => { this.handleMessage(JSON.parse(reader.result)); };
            reader.readAsText(data.data); // results in the onload handled being called.
        }
        handleMessage(msg) {
            if (!this.processedHandshake) {
                this.localPlayerId = msg.id;
                this.processedHandshake = true;
            }
            else {
                switch (msg.cmd) {
                    case "worldState":
                        this.removeDeadEntities(msg.payload);
                        this.updateLivingEntities(msg.payload);
                        break;
                }
            }
        }
        removeDeadEntities(serverEntities) {
            let idsToKill = new Array();
            this.entities.forEach((ent, id) => {
                let found = false;
                serverEntities.forEach((entUpdate) => {
                    if (id == entUpdate.id) {
                        found = true;
                    }
                });
                if (!found) {
                    idsToKill.push(id);
                }
            });
            idsToKill.forEach((id) => {
                let g = this.entities.get(id);
                g.getAnimatedMesh().mesh.dispose();
                g.getAnimatedMesh().skeleton.dispose();
                this.entities.delete(id);
            });
        }
        updateLivingEntities(serverEntities) {
            for (let i = 0; i < serverEntities.length; ++i) {
                let entUpdate = serverEntities[i];
                let g = null;
                if (!this.entities.has(entUpdate.id)) {
                    g = new game_entity_1.GameEntity();
                    this.entities.set(entUpdate.id, g);
                    this.spawnEntity(entUpdate);
                }
                else {
                    g = this.entities.get(entUpdate.id);
                    g.updateFromServer(entUpdate);
                }
                if (this.localPlayerId == entUpdate.id) {
                    this.port_elem.value = entUpdate.score.toString();
                }
            }
        }
        spawnEntity(entInfo) {
            let meshName = 'him'; // this is the name of the asset inside Dude.babylon.
            let meshFolder = '../assets/dude/';
            let meshAsset = 'Dude.babylon';
            if (entInfo.entityType == game_entity_1.EntityType.Monster) {
                meshName = 'Rabbit';
                meshFolder = '../assets/rabbit/';
                meshAsset = 'Rabbit.babylon';
            }
            // let meshLoader = await MeshLoader.load(meshName, meshFolder, meshAsset, this.scene);
            BABYLON.SceneLoader.ImportMesh(meshName, meshFolder, meshAsset, this.scene, (meshes, particles, skeletons) => {
                let mesh = meshes[0];
                let scale = 0.15;
                mesh.name = mesh.name + entInfo.id.toString();
                mesh.scaling = new BABYLON.Vector3(scale, scale, scale);
                mesh.position = new BABYLON.Vector3(entInfo.pos[0], 0, entInfo.pos[1]);
                // console.log('Added at: ' + mesh.position.x + "," + mesh.position.z);
                let entity = this.entities.get(entInfo.id);
                entity.setEntityType(entInfo.entityType);
                entity.setup(new mesh_loader_1.AnimatedMesh(mesh, skeletons[0]), this.scene);
                entity.setColour(entInfo.color);
                entity.setId(entInfo.id);
                entity.setSpeed(entInfo.velocity);
                entity.updateFromServer(entInfo);
            });
        }
    }
    let yz = new YouzuDemo();
});
