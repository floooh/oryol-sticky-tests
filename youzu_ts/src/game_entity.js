define(["require", "exports"], function (require, exports) {
    "use strict";
    (function (EntityType) {
        EntityType[EntityType["Player"] = 0] = "Player";
        EntityType[EntityType["Monster"] = 1] = "Monster";
    })(exports.EntityType || (exports.EntityType = {}));
    var EntityType = exports.EntityType;
    class GameEntity {
        constructor() {
            this.threshold = 0.2;
            this.isSetup = false;
            this.canUpdate = false;
        }
        setup(animatedMesh, scene) {
            this.scene = scene;
            // use a simple box as a pivot; Babylon doesn't provide an empty object.
            this.pivot = BABYLON.Mesh.CreateBox('pivot', 1, scene);
            this.pivot.isVisible = false;
            this.pivot.isPickable = false;
            this.animatedMesh = animatedMesh;
            this.animatedMesh.mesh.parent = this.pivot;
            this.isSetup = true;
        }
        playWalk() {
            switch (this.entityType) {
                case EntityType.Player:
                    this.scene.beginAnimation(this.animatedMesh.skeleton, 0, 100, true);
                    break;
                case EntityType.Monster:
                    this.scene.beginAnimation(this.animatedMesh.skeleton, 0, 73, true);
                    break;
            }
        }
        playIdle() {
            // seems these frames almost look like a standing pose.
            this.scene.beginAnimation(this.animatedMesh.skeleton, 28, 29, true);
        }
        getAnimatedMesh() {
            return this.animatedMesh;
        }
        setEntityType(val) {
            this.entityType = val;
        }
        setId(val) {
            this.id = val;
        }
        getId() {
            return this.id;
        }
        setSpeed(val) {
            this.speed = val;
        }
        setTargetPosition(val) {
            this.targetPosition = val;
        }
        setVelocity(val) {
            this.velocity = val;
            // for some reason the dude and the rabbit are oriented at 180 to each other... 
            switch (this.entityType) {
                case EntityType.Player:
                    this.animatedMesh.mesh.lookAt(this.animatedMesh.mesh.position.add(this.velocity), 0, 0, 0);
                    break;
                case EntityType.Monster:
                    this.animatedMesh.mesh.lookAt(this.animatedMesh.mesh.position.subtract(this.velocity), 0, 0, 0);
                    break;
            }
        }
        setColour(val) {
            this.colour = val;
        }
        update(dt) {
            if (!this.canUpdate)
                return;
            let distToMove = this.speed * dt;
            let adjustedVelocity = this.velocity.multiplyByFloats(distToMove, distToMove, distToMove);
            let dist = this.animatedMesh.mesh.position.subtract(this.targetPosition).lengthSquared();
            if (dist < this.threshold) {
                this.velocity = BABYLON.Vector3.Zero();
                this.animatedMesh.mesh.position = this.targetPosition;
                this.playIdle();
            }
            this.animatedMesh.mesh.position = this.animatedMesh.mesh.position.add(adjustedVelocity);
        }
        updateFromServer(data) {
            if (!this.isSetup)
                return;
            this.canUpdate = true;
            let targetPos = new BABYLON.Vector3(data.targetPos[0], 0, data.targetPos[1]);
            if (!targetPos.equals(this.targetPosition)) {
                this.setTargetPosition(targetPos);
                let direction = this.targetPosition.subtract(this.animatedMesh.mesh.position);
                direction = direction.normalize();
                this.setVelocity(direction);
                this.playWalk();
            }
        }
    }
    exports.GameEntity = GameEntity;
});
