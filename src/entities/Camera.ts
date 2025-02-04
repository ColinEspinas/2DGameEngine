import Entity from "../core/Entity";
import * as PIXI from 'pixi.js';
import Viewport from "../utilities/Viewport";
import Vec from "../utilities/Vec";
import Sprite from "../components/Sprite";
import PIXIScene from "../scenes/PMScene";
import TimeManager from "../managers/TimeManager";
import Ease from "../utilities/Ease";

export default class Camera extends Entity {

	protected _viewport : Viewport;
	protected _center : Vec;
	protected sprite : Sprite;
	protected time : TimeManager;

	protected _target : ITarget;

	protected trauma : number = 0;
	protected traumaPower : number = 2;
	protected traumaDecay : number = 0.8;
	protected maxShakeOffset : Vec = new Vec(100, 75);
	protected maxShakeRoll : number = 10;

	// protected _zoom : number;

	protected _bounds : Vec[];

	public get bounds() : Vec[] { return this._bounds; }
	// public get zoom() : number { return this._zoom; }
	public get center() : Vec { return this._center; }
	public get viewport() : Viewport { return this._viewport; }

	public set target(target : ITarget) { this._target = target; }
	public get target() { return this._target; }

	public get scene() : PIXIScene { return this._scene as PIXIScene; }
	public set scene(scene : PIXIScene) { this._scene = scene; }

	public init() {
		this._viewport = this.engine.getManager("Render").viewport;
		this.time = this.engine.getManager("Time") as TimeManager;
	}

	public update() {
		this._center = new Vec(this.transform.position.x, this.transform.position.y).add(new Vec (this._viewport.width / 2, this._viewport.height / 2));

		if (this.trauma > 0) {
			this.trauma = Math.max(this.trauma - this.traumaDecay * this.time.milliDelta, 0);
			this.shake();
		}

		if (this._target && this._target.position && this._target.position instanceof Vec) {
			if (this.target.horizontal && this.target.vertical) {
				this.moveTo(this.target.position, this.target.options);
			}
			else if (this.target.horizontal) {
				this.moveToHorizontal(this.target.position, this.target.options);
			}
			else if (this.target.vertical) {
				this.moveToVertical(this.target.position, this.target.options);
			}
		}
		if (this._target && this._target.entity && this._target.entity instanceof Entity) {
			if (this.target.horizontal && this.target.vertical) {
				this.moveTo(this.target.entity.transform.position, this.target.options);
			}
			else if (this.target.horizontal) {
				this.moveToHorizontal(this.target.entity.transform.position, this.target.options);
			}
			else if (this.target.vertical) {
				this.moveToVertical(this.target.entity.transform.position, this.target.options);
			}
		}

		for (let i = 0, len = this.scene.layers.length; i < len; ++i) {

			let pivot = this.center;

			this.scene.layers[i].container.pivot.x = pivot.x;
			this.scene.layers[i].container.pivot.y = pivot.y;

			this.scene.layers[i].container.position.x = pivot.x;
			this.scene.layers[i].container.position.y = pivot.y;

			if (!this.scene.layers[i].fixed) {
				this.scene.layers[i].container.position.x = pivot.x - this.transform.position.x * this.scene.layers[i].speed.x;
				this.scene.layers[i].container.position.y = pivot.y - this.transform.position.y * this.scene.layers[i].speed.y;
			}
		}

		this._bounds = [
			this.transform.position,
			new Vec(this.transform.position.x + this._viewport.width, this.transform.position.y),
			new Vec(this.transform.position.x + this._viewport.width, this.transform.position.y + this._viewport.height),
			new Vec(this.transform.position.x, this.transform.position.y + this._viewport.height),
		];
	}

	public worldToCamera(position : Vec) {
		return new Vec(
			position.x - this.transform.position.x,
			position.y - this.transform.position.y
		);
	}

	public cameraToWorld(position : Vec) {
		return new Vec(
			position.x + this.transform.position.x,
			position.y + this.transform.position.y
		);
	}

	public move(direction : Vec, speed ?: number) {
		speed = speed || 1;
		this.transform.position.x += direction.x * speed * this.time.milliDelta * 100;
		this.transform.position.y += direction.y * speed * this.time.milliDelta * 100;
	}

	public moveTo(position : Vec, options : IMoveOptions) : void {
		const tolerance = options.tolerance || 0.5;
		const pos = (options.centered) ? this._center : this.transform.position;
		const centerX = (options.centered) ? this._viewport.width / 2 : 0;
		const centerY = (options.centered) ? this._viewport.height / 2 : 0;

		if (position.distance(pos) > tolerance) {
			this.transform.position.x = Math.floor(Ease.lerp(
				this.transform.position.x, 
				(position.x - centerX) + (options.offset ? options.offset.x : 0), 
				Math.min(1, options.duration * (this.time.milliDelta * 100))
			));
			this.transform.position.y = Math.floor(Ease.lerp(
				this.transform.position.y, 
				(position.y - centerY)  + (options.offset ? options.offset.y : 0), 
				Math.min(1, options.duration * (this.time.milliDelta * 100))
			));
		}
	}

	public moveToHorizontal(position : Vec, options : IMoveOptions) : void {
		const tolerance = options.tolerance || 0.5;
		const pos = (options.centered) ? this._center : this.transform.position;
		const centerX = (options.centered) ? this._viewport.width / 2 : 0;

		if (position.distance(pos) > tolerance) {
			this.transform.position.x = Math.floor(Ease.lerp(
				this.transform.position.x, 
				(position.x - centerX) + (options.offset ? options.offset.x : 0), 
				Math.min(1, options.duration * (this.time.milliDelta * 100))
			));
		}
	}
	
	public moveToVertical(position : Vec, options : IMoveOptions) : void {
		const tolerance = options.tolerance || 0.5;
		const pos = (options.centered) ? this._center : this.transform.position;
		const centerY = (options.centered) ? this._viewport.height / 2 : 0;

		if (position.distance(pos) > tolerance) {
			this.transform.position.y = Math.floor(Ease.lerp(
				this.transform.position.y, 
				(position.y - centerY) + (options.offset ? options.offset.y : 0), 
				Math.min(1, options.duration * (this.time.milliDelta * 100))
			));
		}
	}

	public addTrauma(amount : number) : void {
		this.trauma = Math.min(this.trauma + amount, 1);
	}

	protected shake() : void {
		const amount = Math.pow(this.trauma, this.traumaPower);
		this.rotate(this.maxShakeRoll * amount * Math.random());
		const shakeOffset = new Vec(
			this.maxShakeOffset.x * amount * ((Math.random() * 2) - 1),
			this.maxShakeOffset.y * amount * ((Math.random() * 2) - 1)
		);
		this.moveTo(new Vec(this._center.x + shakeOffset.x, this._center.y + shakeOffset.y),{
			duration : 1,
			centered : true
		});
	}

	// public Zoom(amount : number) {
	// 	this._zoom = amount;
	// 	for (let i = 0, len = this.scene.layers.length; i < len; ++i) {
	// 		this.scene.layers[i].zoom = this._zoom * this.scene.layers[i].zoomCoef;
	// 		for (let j = 0, count = this.scene.layers[i].container.children.length; j < count; ++j) {
	// 			this.scene.layers[i].container.children[j].scale = new PIXI.Point(
	// 				this._zoom * this.scene.layers[i].zoomCoef,
	// 				this._zoom * this.scene.layers[i].zoomCoef
	// 			);
	// 		}
	// 	}
	// }

	public rotate(angle : number) {
		for (let i = 0, len = this.scene.layers.length; i < len; ++i) {
			this.scene.layers[i].container.angle = angle * this.scene.layers[i].rotation;

		}
	}

	public rotateTo(angle : number, speed : number) {
		for (let i = 0, len = this.scene.layers.length; i < len; ++i) {
			if (this.scene.layers[i].container.angle >= angle)
				this.scene.layers[i].container.angle -= speed * this.scene.layers[i].rotation;
			else if (this.scene.layers[i].container.angle <= angle) {
				this.scene.layers[i].container.angle += speed * this.scene.layers[i].rotation;
			}
		}
	}

	public isOnCamera(position : Vec) {
		return (position.x > this.bounds[0].x && position.x < this.bounds[2].x) && (position.y > this.bounds[0].y && position.y < this.bounds[2].y)
	}
}

export interface IMoveOptions {
	time ?: number;
	tolerance ?: number;
	duration : number;
	centered ?: boolean;
	offset ?: Vec;
}

export interface ITarget {
	entity ?: Entity;
	position ?: Vec;
	vertical : boolean;
	horizontal : boolean;
	options : IMoveOptions;
}