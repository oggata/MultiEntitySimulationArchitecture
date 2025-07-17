// キャラクター作成用のクラス
class Character {
	constructor(scene, type, game) {
		//console.log("キャラクター作成");
		this.scene=scene;
		this.type=type;
		this.game=game;
		this.character=new THREE.Group();
		this.scene.add(this.character);

		// アニメーション用の変数
		this.animationTime=0;
		this.isMoving=false;
		this.isRunning=false;
		this.animationSpeed=30.0;
		this.walkAmplitude = 0.4;
		this.armSwingAmplitude = 1.8;

		// 移動関連の変数
		this.position=new THREE.Vector3();
		this.rotation=new THREE.Euler();
		this.velocity=new THREE.Vector3();

		// 攻撃アニメーション用の変数
		this.isAttacking = false;
		this.attackTime = 0;
		this.attackDuration = 0.5;

		// 射撃アニメーション用の変数
		this.isShooting = false;

		// ジャンプアニメーション用の変数
		this.isJumping = false;
		this.jumpTime = 0;
		this.jumpDuration = 0.8;
		this.jumpHeight = 1.0;

		// 仰向けアニメーション用の変数
		this.isFallingBack = false;
		this.fallBackTime = 0;
		this.fallBackDuration = 1.0;

		// キャラクターの作成
		this.createCharacter();
	}

	createCharacter() {
		// 色をすべて白に統一
		const colorA = 0xffffff;
		const colorB = 0xffffff;

		// ルートボーン（腰）- サイズを半分に縮小
		this.rootBone = new THREE.Bone();
		this.rootBone.position.y = 1.5; // 3から1.5に変更

		// 腰のメッシュ（線）- サイズを半分に縮小
		const hipGeometry = new THREE.BoxGeometry(1, 0.5, 0.5); // 2,1,1から1,0.5,0.5に変更
		const hipEdges = new THREE.EdgesGeometry(hipGeometry);
		this.hipMesh = new THREE.LineSegments(hipEdges, new THREE.LineBasicMaterial({ color: colorA, linewidth: 2 }));
		this.rootBone.add(this.hipMesh);

		// 胴体ボーン
		this.spineBone = new THREE.Bone();
		this.spineBone.position.y = 0.5; // 1から0.5に変更
		this.rootBone.add(this.spineBone);

		// 胴体メッシュ（線）- サイズを半分に縮小
		const torsoGeometry = new THREE.BoxGeometry(1, 1, 0.5); // 2,2,1から1,1,0.5に変更
		const torsoEdges = new THREE.EdgesGeometry(torsoGeometry);
		this.torsoMesh = new THREE.LineSegments(torsoEdges, new THREE.LineBasicMaterial({ color: colorA, linewidth: 2 }));
		this.torsoMesh.position.y = 0.25; // 0.5から0.25に変更
		this.spineBone.add(this.torsoMesh);

		// 首ボーン
		this.neckBone = new THREE.Bone();
		this.neckBone.position.y = 0.75; // 1.5から0.75に変更
		this.spineBone.add(this.neckBone);

		// 首メッシュ（線）- サイズを半分に縮小
		const neckGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.25); // 0.5,0.5,0.5から0.25,0.25,0.25に変更
		const neckEdges = new THREE.EdgesGeometry(neckGeometry);
		this.neckMesh = new THREE.LineSegments(neckEdges, new THREE.LineBasicMaterial({ color: colorA, linewidth: 2 }));
		this.neckBone.add(this.neckMesh);

		// 頭ボーン
		this.headBone = new THREE.Bone();
		this.headBone.position.y = 0.25; // 0.5から0.25に変更
		this.neckBone.add(this.headBone);

		// 頭メッシュ（線）- サイズを半分に縮小
		const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5); // 1,1,1から0.5,0.5,0.5に変更
		const headEdges = new THREE.EdgesGeometry(headGeometry);
		this.headMesh = new THREE.LineSegments(headEdges, new THREE.LineBasicMaterial({ color: colorA, linewidth: 2 }));
		this.headMesh.position.y = 0.25; // 0.5から0.25に変更
		this.headBone.add(this.headMesh);

		// 左腕 - サイズを半分に縮小
		this.leftShoulderBone = new THREE.Bone();
		this.leftShoulderBone.position.set(0.6, 0.5, 0); // 1.2,1,0から0.6,0.5,0に変更
		this.spineBone.add(this.leftShoulderBone);
		const leftUpperArmGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2); // 0.4,1.2,0.4から0.2,0.6,0.2に変更
		const leftUpperArmEdges = new THREE.EdgesGeometry(leftUpperArmGeometry);
		this.leftUpperArmMesh = new THREE.LineSegments(leftUpperArmEdges, new THREE.LineBasicMaterial({ color: colorA, linewidth: 2 }));
		this.leftUpperArmMesh.position.y = -0.3; // -0.6から-0.3に変更
		this.leftShoulderBone.add(this.leftUpperArmMesh);
		this.leftElbowBone = new THREE.Bone();
		this.leftElbowBone.position.y = -0.6; // -1.2から-0.6に変更
		this.leftShoulderBone.add(this.leftElbowBone);
		const leftLowerArmGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15); // 0.3,1.0,0.3から0.15,0.5,0.15に変更
		const leftLowerArmEdges = new THREE.EdgesGeometry(leftLowerArmGeometry);
		this.leftLowerArmMesh = new THREE.LineSegments(leftLowerArmEdges, new THREE.LineBasicMaterial({ color: colorA, linewidth: 2 }));
		this.leftLowerArmMesh.position.y = -0.25; // -0.5から-0.25に変更
		this.leftElbowBone.add(this.leftLowerArmMesh);
		this.leftHandBone = new THREE.Bone();
		this.leftHandBone.position.y = -0.5; // -1.0から-0.5に変更
		this.leftElbowBone.add(this.leftHandBone);
		const leftHandGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1); // 0.4,0.4,0.2から0.2,0.2,0.1に変更
		const leftHandEdges = new THREE.EdgesGeometry(leftHandGeometry);
		this.leftHandMesh = new THREE.LineSegments(leftHandEdges, new THREE.LineBasicMaterial({ color: colorA, linewidth: 2 }));
		this.leftHandMesh.position.y = -0.1; // -0.2から-0.1に変更
		this.leftHandBone.add(this.leftHandMesh);

		// 右腕 - サイズを半分に縮小
		this.rightShoulderBone = new THREE.Bone();
		this.rightShoulderBone.position.set(-0.6, 0.5, 0); // -1.2,1,0から-0.6,0.5,0に変更
		this.spineBone.add(this.rightShoulderBone);
		const rightUpperArmGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2); // 0.4,1.2,0.4から0.2,0.6,0.2に変更
		const rightUpperArmEdges = new THREE.EdgesGeometry(rightUpperArmGeometry);
		this.rightUpperArmMesh = new THREE.LineSegments(rightUpperArmEdges, new THREE.LineBasicMaterial({ color: colorA, linewidth: 2 }));
		this.rightUpperArmMesh.position.y = -0.3; // -0.6から-0.3に変更
		this.rightShoulderBone.add(this.rightUpperArmMesh);
		this.rightElbowBone = new THREE.Bone();
		this.rightElbowBone.position.y = -0.6; // -1.2から-0.6に変更
		this.rightShoulderBone.add(this.rightElbowBone);
		const rightLowerArmGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15); // 0.3,1.0,0.3から0.15,0.5,0.15に変更
		const rightLowerArmEdges = new THREE.EdgesGeometry(rightLowerArmGeometry);
		this.rightLowerArmMesh = new THREE.LineSegments(rightLowerArmEdges, new THREE.LineBasicMaterial({ color: colorB, linewidth: 2 }));
		this.rightLowerArmMesh.position.y = -0.25; // -0.5から-0.25に変更
		this.rightElbowBone.add(this.rightLowerArmMesh);
		this.rightHandBone = new THREE.Bone();
		this.rightHandBone.position.y = -0.5; // -1.0から-0.5に変更
		this.rightElbowBone.add(this.rightHandBone);
		const rightHandGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1); // 0.4,0.4,0.2から0.2,0.2,0.1に変更
		const rightHandEdges = new THREE.EdgesGeometry(rightHandGeometry);
		this.rightHandMesh = new THREE.LineSegments(rightHandEdges, new THREE.LineBasicMaterial({ color: colorA, linewidth: 2 }));
		this.rightHandMesh.position.y = -0.1; // -0.2から-0.1に変更
		this.rightHandBone.add(this.rightHandMesh);

		// 左脚 - サイズを半分に縮小
		this.leftHipBone = new THREE.Bone();
		this.leftHipBone.position.set(0.25, -0.25, 0); // 0.5,-0.5,0から0.25,-0.25,0に変更
		this.rootBone.add(this.leftHipBone);
		const leftThighGeometry = new THREE.BoxGeometry(0.3, 0.75, 0.3); // 0.6,1.5,0.6から0.3,0.75,0.3に変更
		const leftThighEdges = new THREE.EdgesGeometry(leftThighGeometry);
		this.leftThighMesh = new THREE.LineSegments(leftThighEdges, new THREE.LineBasicMaterial({ color: colorB, linewidth: 2 }));
		this.leftThighMesh.position.y = -0.375; // -0.75から-0.375に変更
		this.leftHipBone.add(this.leftThighMesh);
		this.leftKneeBone = new THREE.Bone();
		this.leftKneeBone.position.y = -0.75; // -1.5から-0.75に変更
		this.leftHipBone.add(this.leftKneeBone);
		const leftShinGeometry = new THREE.BoxGeometry(0.25, 0.75, 0.25); // 0.5,1.5,0.5から0.25,0.75,0.25に変更
		const leftShinEdges = new THREE.EdgesGeometry(leftShinGeometry);
		this.leftShinMesh = new THREE.LineSegments(leftShinEdges, new THREE.LineBasicMaterial({ color: colorA, linewidth: 2 }));
		this.leftShinMesh.position.y = -0.375; // -0.75から-0.375に変更
		this.leftKneeBone.add(this.leftShinMesh);
		this.leftFootBone = new THREE.Bone();
		this.leftFootBone.position.y = -0.75; // -1.5から-0.75に変更
		this.leftKneeBone.add(this.leftFootBone);
		const leftFootGeometry = new THREE.BoxGeometry(0.25, 0.1, 0.4); // 0.5,0.2,0.8から0.25,0.1,0.4に変更
		const leftFootEdges = new THREE.EdgesGeometry(leftFootGeometry);
		this.leftFootMesh = new THREE.LineSegments(leftFootEdges, new THREE.LineBasicMaterial({ color: colorB, linewidth: 2 }));
		this.leftFootMesh.position.set(0, -0.05, 0.1); // 0,-0.1,0.2から0,-0.05,0.1に変更
		this.leftFootBone.add(this.leftFootMesh);

		// 右脚 - サイズを半分に縮小
		this.rightHipBone = new THREE.Bone();
		this.rightHipBone.position.set(-0.25, -0.25, 0); // -0.5,-0.5,0から-0.25,-0.25,0に変更
		this.rootBone.add(this.rightHipBone);
		const rightThighGeometry = new THREE.BoxGeometry(0.3, 0.75, 0.3); // 0.6,1.5,0.6から0.3,0.75,0.3に変更
		const rightThighEdges = new THREE.EdgesGeometry(rightThighGeometry);
		this.rightThighMesh = new THREE.LineSegments(rightThighEdges, new THREE.LineBasicMaterial({ color: colorB, linewidth: 2 }));
		this.rightThighMesh.position.y = -0.375; // -0.75から-0.375に変更
		this.rightHipBone.add(this.rightThighMesh);
		this.rightKneeBone = new THREE.Bone();
		this.rightKneeBone.position.y = -0.75; // -1.5から-0.75に変更
		this.rightHipBone.add(this.rightKneeBone);
		const rightShinGeometry = new THREE.BoxGeometry(0.25, 0.75, 0.25); // 0.5,1.5,0.5から0.25,0.75,0.25に変更
		const rightShinEdges = new THREE.EdgesGeometry(rightShinGeometry);
		this.rightShinMesh = new THREE.LineSegments(rightShinEdges, new THREE.LineBasicMaterial({ color: colorA, linewidth: 2 }));
		this.rightShinMesh.position.y = -0.375; // -0.75から-0.375に変更
		this.rightKneeBone.add(this.rightShinMesh);
		this.rightFootBone = new THREE.Bone();
		this.rightFootBone.position.y = -0.75; // -1.5から-0.75に変更
		this.rightKneeBone.add(this.rightFootBone);
		const rightFootGeometry = new THREE.BoxGeometry(0.25, 0.1, 0.4); // 0.5,0.2,0.8から0.25,0.1,0.4に変更
		const rightFootEdges = new THREE.EdgesGeometry(rightFootGeometry);
		this.rightFootMesh = new THREE.LineSegments(rightFootEdges, new THREE.LineBasicMaterial({ color: colorB, linewidth: 2 }));
		this.rightFootMesh.position.set(0, -0.05, 0.1); // 0,-0.1,0.2から0,-0.05,0.1に変更
		this.rightFootBone.add(this.rightFootMesh);

		// ボーンシステムをキャラクターに追加
		this.character.add(this.rootBone);

		// キャラクター全体のスケールを1/4に設定
		this.character.scale.set(1/4, 1/4, 1/4);
	}

	updateLimbAnimation(deltaTime) {
		this.animationTime += deltaTime * this.animationSpeed;

		if (this.isFallingBack) {
			this.updateFallBackAnimation(deltaTime);
			return;
		}

		if (this.isJumping) {
			this.updateJumpAnimation(deltaTime);
			return;
		}

		if (this.isAttacking) {
			this.updateAttackAnimation(deltaTime);
			return;
		}

		/*
		//this.isShooting = true;
		if (this.isShooting) {
			// 腰の上下動と前後の傾き
			this.rootBone.position.y = 3 + Math.sin(this.animationTime * 2) * 0.1;
			this.rootBone.rotation.x = Math.sin(this.animationTime * 2) * 0.02;
			
			// 胴体の微妙な揺れ
			this.spineBone.rotation.z = Math.sin(this.animationTime) * 0.05;
			this.spineBone.rotation.x = Math.sin(this.animationTime * 2) * 0.02;
			
			// 左脚の動き
			this.leftHipBone.rotation.x = Math.sin(this.animationTime) * this.walkAmplitude;
			this.leftKneeBone.rotation.x = Math.max(0, Math.sin(this.animationTime - 0.5) * this.walkAmplitude * 1.2);
			this.leftFootBone.rotation.x = Math.sin(this.animationTime - 1) * 0.3;
			
			// 右脚の動き（左脚と逆位相）
			this.rightHipBone.rotation.x = Math.sin(this.animationTime + Math.PI) * this.walkAmplitude;
			this.rightKneeBone.rotation.x = Math.max(0, Math.sin(this.animationTime + Math.PI - 0.5) * this.walkAmplitude * 1.2);
			this.rightFootBone.rotation.x = Math.sin(this.animationTime + Math.PI - 1) * 0.3;
			
			// 左腕の射撃姿勢
			this.leftShoulderBone.rotation.z = -0.15;
			this.leftShoulderBone.rotation.x = -Math.PI / 4; // 45度前方に
			this.leftElbowBone.rotation.x = -1.5; // 肘を曲げる
			
			// 右腕の射撃姿勢
			this.rightShoulderBone.rotation.z = 0.15;
			this.rightShoulderBone.rotation.x = -Math.PI / 6; // 30度前方に
			this.rightElbowBone.rotation.x = -0.8; // 肘を少し曲げる
			
			// 頭の自然な動き
			this.headBone.rotation.y = Math.sin(this.animationTime * 0.5) * 0.1;
			this.headBone.rotation.x = Math.sin(this.animationTime * 2) * 0.05;
			return;
		}
			*/

		if (this.isMoving) {
			// デバッグ用：歩行アニメーションが動作していることを確認
			if (Math.floor(this.animationTime * 10) % 100 === 0) {
				console.log('歩行アニメーション動作中:', this.isMoving, this.isRunning);
			}
			
			// 腰の上下動と前後の傾き
			this.rootBone.position.y = 3 + Math.sin(this.animationTime * 2) * 0.1;
			this.rootBone.rotation.x = Math.sin(this.animationTime * 2) * 0.02;
			
			// 胴体の微妙な揺れ
			this.spineBone.rotation.z = Math.sin(this.animationTime) * 0.05;
			this.spineBone.rotation.x = Math.sin(this.animationTime * 2) * 0.02;
			
			// 左脚の動き
			this.leftHipBone.rotation.x = Math.sin(this.animationTime) * this.walkAmplitude;
			this.leftKneeBone.rotation.x = Math.max(0, Math.sin(this.animationTime - 0.5) * this.walkAmplitude * 1.2);
			this.leftFootBone.rotation.x = Math.sin(this.animationTime - 1) * 0.3;
			
			// 右脚の動き（左脚と逆位相）
			this.rightHipBone.rotation.x = Math.sin(this.animationTime + Math.PI) * this.walkAmplitude;
			this.rightKneeBone.rotation.x = Math.max(0, Math.sin(this.animationTime + Math.PI - 0.5) * this.walkAmplitude * 1.2);
			this.rightFootBone.rotation.x = Math.sin(this.animationTime + Math.PI - 1) * 0.3;
			
			// 左腕の振り（右脚と同位相）
			this.leftShoulderBone.rotation.z = -0.15;
			this.leftShoulderBone.rotation.x = Math.sin(this.animationTime + Math.PI) * this.armSwingAmplitude * 0.4;
			this.leftElbowBone.rotation.x = -1.2 + Math.sin(this.animationTime + Math.PI - 0.5) * 0.1;
			
			// 右腕の振り（左脚と同位相）
			this.rightShoulderBone.rotation.z = 0.15;
			this.rightShoulderBone.rotation.x = Math.sin(this.animationTime) * this.armSwingAmplitude * 0.4;
			this.rightElbowBone.rotation.x = -1.2 + Math.sin(this.animationTime - 0.5) * 0.1;
			
			// 頭の自然な動き
			this.headBone.rotation.y = Math.sin(this.animationTime * 0.5) * 0.1;
			this.headBone.rotation.x = Math.sin(this.animationTime * 2) * 0.05;
		} else {
			// アイドルアニメーション
			this.rootBone.position.y = 3;
			this.rootBone.rotation.x = 0;
			this.spineBone.rotation.set(0, 0, 0);
			this.leftHipBone.rotation.set(0, 0, 0);
			this.rightHipBone.rotation.set(0, 0, 0);
			this.leftKneeBone.rotation.set(0, 0, 0);
			this.rightKneeBone.rotation.set(0, 0, 0);
			this.leftFootBone.rotation.set(0, 0, 0);
			this.rightFootBone.rotation.set(0, 0, 0);
			this.leftShoulderBone.rotation.set(0, 0, -0.15);
			this.rightShoulderBone.rotation.set(0, 0, 0.15);
			this.leftElbowBone.rotation.set(-1.2, 0, 0);
			this.rightElbowBone.rotation.set(-1.2, 0, 0);
			this.headBone.rotation.set(0, 0, 0);
		}
	}

	updateAttackAnimation(deltaTime) {
		this.attackTime += deltaTime;
		const progress = Math.min(this.attackTime / this.attackDuration, 1);
		
		if (progress < 0.5) {
			const upProgress = progress * 2;
			const armAngle = upProgress * Math.PI / 2;
			this.leftShoulderBone.rotation.x = -armAngle;
			this.rightShoulderBone.rotation.x = -armAngle;
		} else {
			const downProgress = (progress - 0.5) * 2;
			const armAngle = Math.PI / 2 - (downProgress * Math.PI / 2);
			this.leftShoulderBone.rotation.x = -armAngle;
			this.rightShoulderBone.rotation.x = -armAngle;
		}
		
		if (progress >= 1) {
			this.isAttacking = false;
			this.leftShoulderBone.rotation.x = 0;
			this.rightShoulderBone.rotation.x = 0;
		}
	}

	updateJumpAnimation(deltaTime) {
		this.jumpTime += deltaTime;
		const progress = Math.min(this.jumpTime / this.jumpDuration, 1);
		
		// ジャンプの高さ計算（放物線）
		const jumpProgress = Math.sin(progress * Math.PI);
		this.rootBone.position.y = 3 + jumpProgress * this.jumpHeight;
		
		// 膝の曲げ具合
		const kneeBend = Math.sin(progress * Math.PI * 2) * 0.5;
		this.leftKneeBone.rotation.x = kneeBend;
		this.rightKneeBone.rotation.x = kneeBend;
		
		// 腕の水平挙上
		const armRaise = Math.min(progress * 2, 1) * Math.PI / 2;
		this.leftShoulderBone.rotation.x = -armRaise;
		this.rightShoulderBone.rotation.x = -armRaise;
		
		// ジャンプ終了時の処理
		if (progress >= 1) {
			this.isJumping = false;
			this.jumpTime = 0;
			// 元の姿勢に戻す
			this.leftKneeBone.rotation.x = 0;
			this.rightKneeBone.rotation.x = 0;
			this.leftShoulderBone.rotation.x = 0;
			this.rightShoulderBone.rotation.x = 0;
		}
	}

	updateFallBackAnimation(deltaTime) {
		this.fallBackTime += deltaTime;
		const progress = Math.min(this.fallBackTime / this.fallBackDuration, 1);
		
		// 胴体を後ろに倒す
		this.spineBone.rotation.x = progress * Math.PI / 2;
		
		// 腕を広げる
		const armSpread = progress * Math.PI / 2;
		this.leftShoulderBone.rotation.z = -armSpread;
		this.rightShoulderBone.rotation.z = armSpread;
		
		// 膝を曲げる
		const kneeBend = progress * Math.PI / 4;
		this.leftKneeBone.rotation.x = kneeBend;
		this.rightKneeBone.rotation.x = kneeBend;
		
		// 頭を後ろに倒す
		this.headBone.rotation.x = progress * Math.PI / 4;
		
		// 全体を少し下げる
		this.rootBone.position.y = 3 - progress * 0.5;
	}

	startFallBack() {
		if (!this.isFallingBack && !this.isJumping && !this.isAttacking && !this.isShooting) {
			this.isFallingBack = true;
			this.fallBackTime = 0;
		}
	}

	stopFallBack() {
		this.isFallingBack = false;
		this.fallBackTime = 0;
		// 元の姿勢に戻す
		this.spineBone.rotation.x = 0;
		this.leftShoulderBone.rotation.z = -0.15;
		this.rightShoulderBone.rotation.z = 0.15;
		this.leftKneeBone.rotation.x = 0;
		this.rightKneeBone.rotation.x = 0;
		this.headBone.rotation.x = 0;
		this.rootBone.position.y = 3;
	}

	startJump() {
		if (!this.isJumping && !this.isAttacking && !this.isShooting) {
			this.isJumping = true;
			this.jumpTime = 0;
		}
	}

	move(direction, speed, deltaTime) {
		if (direction.length() > 0) {
			direction.normalize();
		}

		const currentSpeed = speed;
		this.velocity.copy(direction).multiplyScalar(currentSpeed * deltaTime);
		this.velocity.applyEuler(this.rotation);
		this.position.add(this.velocity);
		this.character.position.copy(this.position);
		this.isMoving = direction.length() > 0;

		const height = this.game.fieldMap.getHeightAt(this.position.x, this.position.z);
		if (height != null) {
			this.position.y = height + 0.5;
		}
	}

	setPosition(x, y, z) {
		this.position.set(x, y, z);
		this.character.position.copy(this.position);
	}

	getPosition() {
		return this.position;
	}

	setRotation(y) {
		this.rotation.y = y;
		if (this.type === "player") {
			this.character.rotation.y = y + Math.PI; // プレイヤーの場合は180度回転を加える
		} else {
			this.character.rotation.y = y;
		}
	}

	getRotation() {
		return this.rotation;
	}

	setRunning(isRunning) {
		this.isRunning = isRunning;
		this.isMoving = isRunning;
		this.animationSpeed = isRunning ? 18.0 : 18.0; // 常に2倍の速度を維持
	}

	startAttack() {
		this.isAttacking = true;
		this.attackTime = 0;
	}

	startShooting() {
		this.isShooting = true;
	}

	stopShooting() {
		this.isShooting = false;
	}

	setColor(color) {

		//console.log("color-" + color);

		// 色を16進数に変換
		const hexColor = (typeof color === 'string') ? parseInt(color, 16) : color;
		
		// デバッグログ
		//console.log('Setting character color:', hexColor.toString(16));
		
		// 上半身のパーツ（胴体、腕）
		const upperBodyParts = [
			this.headMesh,
			this.torsoMesh,
			this.leftUpperArmMesh,
			this.leftLowerArmMesh,
			this.rightUpperArmMesh,
			this.rightLowerArmMesh,
			this.hipMesh
		];
		
		// 下半身のパーツ
		const lowerBodyParts = [
			this.leftThighMesh,
			this.leftShinMesh,
			this.rightThighMesh,
			this.rightShinMesh,
			this.leftFootMesh,
			this.rightFootMesh
		];

		// 色をRGBに分解
		const r = (hexColor >> 16) & 255;
		const g = (hexColor >> 8) & 255;
		const b = hexColor & 255;

		// 上半身用の色を作成（より明るく）
		const upperR = Math.min(255, Math.floor(r * 1.6));
		const upperG = Math.min(255, Math.floor(g * 1.6));
		const upperB = Math.min(255, Math.floor(b * 1.6));
		const upperColor = (upperR << 16) | (upperG << 8) | upperB;

		// 下半身用の色を作成（上半身より暗め）
		const lowerR = Math.min(255, Math.floor(r * 0.8));
		const lowerG = Math.min(255, Math.floor(g * 0.8));
		const lowerB = Math.min(255, Math.floor(b * 0.8));
		const lowerColor = (lowerR << 16) | (lowerG << 8) | lowerB;

		// 上半身のパーツに色を設定
		upperBodyParts.forEach(part => {
			if (part && part.material) {
				part.material = new THREE.MeshPhongMaterial({
					color: upperColor,
					shininess: 5,
					specular: upperColor,
					emissive: upperColor,
					emissiveIntensity: 0.6,
					side: THREE.DoubleSide
				});
				part.material.needsUpdate = true;
			}
		});

		// 下半身のパーツに色を設定
		lowerBodyParts.forEach(part => {
			if (part && part.material) {
				part.material = new THREE.MeshPhongMaterial({
					color: lowerColor,
					shininess: 5,
					specular: lowerColor,
					emissive: lowerColor,
					emissiveIntensity: 0.6,
					side: THREE.DoubleSide
				});
				part.material.needsUpdate = true;
			}
		});
	}


	dispose() {
		this.scene.remove(this.character);
		
		// メッシュとマテリアルの解放
		const meshes = [
			this.hipMesh, this.torsoMesh, this.neckMesh, this.headMesh,
			this.leftUpperArmMesh, this.leftLowerArmMesh, this.leftHandMesh,
			this.rightUpperArmMesh, this.rightLowerArmMesh, this.rightHandMesh,
			this.leftThighMesh, this.leftShinMesh, this.leftFootMesh,
			this.rightThighMesh, this.rightShinMesh, this.rightFootMesh
		];
		
		meshes.forEach(mesh => {
			if (mesh) {
				mesh.geometry.dispose();
				mesh.material.dispose();
			}
		});
	}
}