define(["require", "exports"], function (require, exports) {
    "use strict";
    class AnimatedMesh {
        constructor(mesh, skeleton) {
            this.mesh = mesh;
            this.skeleton = skeleton;
        }
    }
    exports.AnimatedMesh = AnimatedMesh;
    class MeshLoader {
        constructor(meshes, particleSystems, skeletons) {
            this.meshes = meshes;
            this.particleSystems = particleSystems;
            this.skeletons = skeletons;
        }
        static load(meshName, rootUrl, sceneName, scene) {
            return new Promise(resolve => {
                let converter = (meshes, particleSystems, skeletons) => {
                    let meshLoader = new MeshLoader(meshes, particleSystems, skeletons);
                    resolve(meshLoader);
                };
                BABYLON.SceneLoader.ImportMesh(meshName, rootUrl, sceneName, scene, converter);
            });
        }
        getMeshAt(atIndex) {
            return new AnimatedMesh(this.meshes[atIndex], this.skeletons[atIndex]);
        }
    }
    exports.MeshLoader = MeshLoader;
});
