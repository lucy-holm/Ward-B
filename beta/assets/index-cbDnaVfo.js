(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function e(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(s){if(s.ep)return;s.ep=!0;const a=e(s);fetch(s.href,a)}})();/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Rl="168",Wu=0,mc=1,Zu=2,xd=1,Yu=2,qn=3,fi=0,on=1,Un=2,hi=0,hs=1,gc=2,_c=3,vc=4,qu=5,Ri=100,$u=101,Ku=102,ju=103,Ju=104,Qu=200,tf=201,ef=202,nf=203,_o=204,vo=205,sf=206,af=207,rf=208,of=209,lf=210,cf=211,hf=212,df=213,uf=214,ff=0,pf=1,mf=2,nr=3,gf=4,_f=5,vf=6,xf=7,Pl=0,Mf=1,yf=2,di=0,Sf=1,wf=2,bf=3,Ef=4,Tf=5,Af=6,Cf=7,Md=300,fs=301,ps=302,xo=303,Mo=304,Mr=306,Je=1e3,Li=1001,yo=1002,Mn=1003,Rf=1004,xa=1005,An=1006,Nr=1007,Ii=1008,ti=1009,yd=1010,Sd=1011,sa=1012,Ll=1013,Ni=1014,Kn=1015,la=1016,Il=1017,Dl=1018,ms=1020,wd=35902,bd=1021,Ed=1022,Cn=1023,Td=1024,Ad=1025,ds=1026,gs=1027,Cd=1028,Ul=1029,Rd=1030,Nl=1031,Ol=1033,Ya=33776,qa=33777,$a=33778,Ka=33779,So=35840,wo=35841,bo=35842,Eo=35843,To=36196,Ao=37492,Co=37496,Ro=37808,Po=37809,Lo=37810,Io=37811,Do=37812,Uo=37813,No=37814,Oo=37815,Fo=37816,zo=37817,ko=37818,Bo=37819,Ho=37820,Go=37821,ja=36492,Xo=36494,Vo=36495,Pd=36283,Wo=36284,Zo=36285,Yo=36286,Pf=3200,Lf=3201,Fl=0,If=1,ci="",In="srgb",_i="srgb-linear",zl="display-p3",yr="display-p3-linear",ir="linear",re="srgb",sr="rec709",ar="p3",Bi=7680,xc=519,Df=512,Uf=513,Nf=514,Ld=515,Of=516,Ff=517,zf=518,kf=519,Mc=35044,yc="300 es",jn=2e3,rr=2001;class xs{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(e)===-1&&i[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const i=this._listeners;return i[t]!==void 0&&i[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const s=this._listeners[t];if(s!==void 0){const a=s.indexOf(e);a!==-1&&s.splice(a,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const i=this._listeners[t.type];if(i!==void 0){t.target=this;const s=i.slice(0);for(let a=0,r=s.length;a<r;a++)s[a].call(this,t);t.target=null}}}const We=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Or=Math.PI/180,qo=180/Math.PI;function ca(){const n=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(We[n&255]+We[n>>8&255]+We[n>>16&255]+We[n>>24&255]+"-"+We[t&255]+We[t>>8&255]+"-"+We[t>>16&15|64]+We[t>>24&255]+"-"+We[e&63|128]+We[e>>8&255]+"-"+We[e>>16&255]+We[e>>24&255]+We[i&255]+We[i>>8&255]+We[i>>16&255]+We[i>>24&255]).toLowerCase()}function sn(n,t,e){return Math.max(t,Math.min(e,n))}function Bf(n,t){return(n%t+t)%t}function Fr(n,t,e){return(1-e)*n+e*t}function Ss(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function nn(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}class Ht{constructor(t=0,e=0){Ht.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,i=this.y,s=t.elements;return this.x=s[0]*e+s[3]*i+s[6],this.y=s[1]*e+s[4]*i+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(t,Math.min(e,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos(sn(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y;return e*e+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const i=Math.cos(e),s=Math.sin(e),a=this.x-t.x,r=this.y-t.y;return this.x=a*i-r*s+t.x,this.y=a*s+r*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Nt{constructor(t,e,i,s,a,r,o,l,c){Nt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,i,s,a,r,o,l,c)}set(t,e,i,s,a,r,o,l,c){const h=this.elements;return h[0]=t,h[1]=s,h[2]=o,h[3]=e,h[4]=a,h[5]=l,h[6]=i,h[7]=r,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],this}extractBasis(t,e,i){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,s=e.elements,a=this.elements,r=i[0],o=i[3],l=i[6],c=i[1],h=i[4],d=i[7],u=i[2],f=i[5],g=i[8],_=s[0],m=s[3],p=s[6],S=s[1],y=s[4],b=s[7],C=s[2],E=s[5],T=s[8];return a[0]=r*_+o*S+l*C,a[3]=r*m+o*y+l*E,a[6]=r*p+o*b+l*T,a[1]=c*_+h*S+d*C,a[4]=c*m+h*y+d*E,a[7]=c*p+h*b+d*T,a[2]=u*_+f*S+g*C,a[5]=u*m+f*y+g*E,a[8]=u*p+f*b+g*T,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[1],s=t[2],a=t[3],r=t[4],o=t[5],l=t[6],c=t[7],h=t[8];return e*r*h-e*o*c-i*a*h+i*o*l+s*a*c-s*r*l}invert(){const t=this.elements,e=t[0],i=t[1],s=t[2],a=t[3],r=t[4],o=t[5],l=t[6],c=t[7],h=t[8],d=h*r-o*c,u=o*l-h*a,f=c*a-r*l,g=e*d+i*u+s*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return t[0]=d*_,t[1]=(s*c-h*i)*_,t[2]=(o*i-s*r)*_,t[3]=u*_,t[4]=(h*e-s*l)*_,t[5]=(s*a-o*e)*_,t[6]=f*_,t[7]=(i*l-c*e)*_,t[8]=(r*e-i*a)*_,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,i,s,a,r,o){const l=Math.cos(a),c=Math.sin(a);return this.set(i*l,i*c,-i*(l*r+c*o)+r+t,-s*c,s*l,-s*(-c*r+l*o)+o+e,0,0,1),this}scale(t,e){return this.premultiply(zr.makeScale(t,e)),this}rotate(t){return this.premultiply(zr.makeRotation(-t)),this}translate(t,e){return this.premultiply(zr.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,i,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,i=t.elements;for(let s=0;s<9;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<9;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const zr=new Nt;function Id(n){for(let t=n.length-1;t>=0;--t)if(n[t]>=65535)return!0;return!1}function or(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function Hf(){const n=or("canvas");return n.style.display="block",n}const Sc={};function qs(n){n in Sc||(Sc[n]=!0,console.warn(n))}function Gf(n,t,e){return new Promise(function(i,s){function a(){switch(n.clientWaitSync(t,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(a,e);break;default:i()}}setTimeout(a,e)})}const wc=new Nt().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),bc=new Nt().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),ws={[_i]:{transfer:ir,primaries:sr,luminanceCoefficients:[.2126,.7152,.0722],toReference:n=>n,fromReference:n=>n},[In]:{transfer:re,primaries:sr,luminanceCoefficients:[.2126,.7152,.0722],toReference:n=>n.convertSRGBToLinear(),fromReference:n=>n.convertLinearToSRGB()},[yr]:{transfer:ir,primaries:ar,luminanceCoefficients:[.2289,.6917,.0793],toReference:n=>n.applyMatrix3(bc),fromReference:n=>n.applyMatrix3(wc)},[zl]:{transfer:re,primaries:ar,luminanceCoefficients:[.2289,.6917,.0793],toReference:n=>n.convertSRGBToLinear().applyMatrix3(bc),fromReference:n=>n.applyMatrix3(wc).convertLinearToSRGB()}},Xf=new Set([_i,yr]),te={enabled:!0,_workingColorSpace:_i,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(n){if(!Xf.has(n))throw new Error(`Unsupported working color space, "${n}".`);this._workingColorSpace=n},convert:function(n,t,e){if(this.enabled===!1||t===e||!t||!e)return n;const i=ws[t].toReference,s=ws[e].fromReference;return s(i(n))},fromWorkingColorSpace:function(n,t){return this.convert(n,this._workingColorSpace,t)},toWorkingColorSpace:function(n,t){return this.convert(n,t,this._workingColorSpace)},getPrimaries:function(n){return ws[n].primaries},getTransfer:function(n){return n===ci?ir:ws[n].transfer},getLuminanceCoefficients:function(n,t=this._workingColorSpace){return n.fromArray(ws[t].luminanceCoefficients)}};function us(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function kr(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Hi;class Vf{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{Hi===void 0&&(Hi=or("canvas")),Hi.width=t.width,Hi.height=t.height;const i=Hi.getContext("2d");t instanceof ImageData?i.putImageData(t,0,0):i.drawImage(t,0,0,t.width,t.height),e=Hi}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=or("canvas");e.width=t.width,e.height=t.height;const i=e.getContext("2d");i.drawImage(t,0,0,t.width,t.height);const s=i.getImageData(0,0,t.width,t.height),a=s.data;for(let r=0;r<a.length;r++)a[r]=us(a[r]/255)*255;return i.putImageData(s,0,0),e}else if(t.data){const e=t.data.slice(0);for(let i=0;i<e.length;i++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[i]=Math.floor(us(e[i]/255)*255):e[i]=us(e[i]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let Wf=0;class Dd{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Wf++}),this.uuid=ca(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let a;if(Array.isArray(s)){a=[];for(let r=0,o=s.length;r<o;r++)s[r].isDataTexture?a.push(Br(s[r].image)):a.push(Br(s[r]))}else a=Br(s);i.url=a}return e||(t.images[this.uuid]=i),i}}function Br(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Vf.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Zf=0;class Ke extends xs{constructor(t=Ke.DEFAULT_IMAGE,e=Ke.DEFAULT_MAPPING,i=Li,s=Li,a=An,r=Ii,o=Cn,l=ti,c=Ke.DEFAULT_ANISOTROPY,h=ci){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Zf++}),this.uuid=ca(),this.name="",this.source=new Dd(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=a,this.minFilter=r,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new Ht(0,0),this.repeat=new Ht(1,1),this.center=new Ht(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Nt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),e||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Md)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Je:t.x=t.x-Math.floor(t.x);break;case Li:t.x=t.x<0?0:1;break;case yo:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Je:t.y=t.y-Math.floor(t.y);break;case Li:t.y=t.y<0?0:1;break;case yo:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Ke.DEFAULT_IMAGE=null;Ke.DEFAULT_MAPPING=Md;Ke.DEFAULT_ANISOTROPY=1;class oe{constructor(t=0,e=0,i=0,s=1){oe.prototype.isVector4=!0,this.x=t,this.y=e,this.z=i,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,i,s){return this.x=t,this.y=e,this.z=i,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,i=this.y,s=this.z,a=this.w,r=t.elements;return this.x=r[0]*e+r[4]*i+r[8]*s+r[12]*a,this.y=r[1]*e+r[5]*i+r[9]*s+r[13]*a,this.z=r[2]*e+r[6]*i+r[10]*s+r[14]*a,this.w=r[3]*e+r[7]*i+r[11]*s+r[15]*a,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,i,s,a;const l=t.elements,c=l[0],h=l[4],d=l[8],u=l[1],f=l[5],g=l[9],_=l[2],m=l[6],p=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-_)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+_)<.1&&Math.abs(g+m)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const y=(c+1)/2,b=(f+1)/2,C=(p+1)/2,E=(h+u)/4,T=(d+_)/4,L=(g+m)/4;return y>b&&y>C?y<.01?(i=0,s=.707106781,a=.707106781):(i=Math.sqrt(y),s=E/i,a=T/i):b>C?b<.01?(i=.707106781,s=0,a=.707106781):(s=Math.sqrt(b),i=E/s,a=L/s):C<.01?(i=.707106781,s=.707106781,a=0):(a=Math.sqrt(C),i=T/a,s=L/a),this.set(i,s,a,e),this}let S=Math.sqrt((m-g)*(m-g)+(d-_)*(d-_)+(u-h)*(u-h));return Math.abs(S)<.001&&(S=1),this.x=(m-g)/S,this.y=(d-_)/S,this.z=(u-h)/S,this.w=Math.acos((c+f+p-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(t,Math.min(e,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this.w=t.w+(e.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Yf extends xs{constructor(t=1,e=1,i={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new oe(0,0,t,e),this.scissorTest=!1,this.viewport=new oe(0,0,t,e);const s={width:t,height:e,depth:1};i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:An,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},i);const a=new Ke(s,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace);a.flipY=!1,a.generateMipmaps=i.generateMipmaps,a.internalFormat=i.internalFormat,this.textures=[];const r=i.count;for(let o=0;o<r;o++)this.textures[o]=a.clone(),this.textures[o].isRenderTargetTexture=!0;this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}setSize(t,e,i=1){if(this.width!==t||this.height!==e||this.depth!==i){this.width=t,this.height=e,this.depth=i;for(let s=0,a=this.textures.length;s<a;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=i;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let i=0,s=t.textures.length;i<s;i++)this.textures[i]=t.textures[i].clone(),this.textures[i].isRenderTargetTexture=!0;const e=Object.assign({},t.texture.image);return this.texture.source=new Dd(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Oi extends Yf{constructor(t=1,e=1,i={}){super(t,e,i),this.isWebGLRenderTarget=!0}}class Ud extends Ke{constructor(t=null,e=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=Mn,this.minFilter=Mn,this.wrapR=Li,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class qf extends Ke{constructor(t=null,e=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=Mn,this.minFilter=Mn,this.wrapR=Li,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ha{constructor(t=0,e=0,i=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=i,this._w=s}static slerpFlat(t,e,i,s,a,r,o){let l=i[s+0],c=i[s+1],h=i[s+2],d=i[s+3];const u=a[r+0],f=a[r+1],g=a[r+2],_=a[r+3];if(o===0){t[e+0]=l,t[e+1]=c,t[e+2]=h,t[e+3]=d;return}if(o===1){t[e+0]=u,t[e+1]=f,t[e+2]=g,t[e+3]=_;return}if(d!==_||l!==u||c!==f||h!==g){let m=1-o;const p=l*u+c*f+h*g+d*_,S=p>=0?1:-1,y=1-p*p;if(y>Number.EPSILON){const C=Math.sqrt(y),E=Math.atan2(C,p*S);m=Math.sin(m*E)/C,o=Math.sin(o*E)/C}const b=o*S;if(l=l*m+u*b,c=c*m+f*b,h=h*m+g*b,d=d*m+_*b,m===1-o){const C=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=C,c*=C,h*=C,d*=C}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,i,s,a,r){const o=i[s],l=i[s+1],c=i[s+2],h=i[s+3],d=a[r],u=a[r+1],f=a[r+2],g=a[r+3];return t[e]=o*g+h*d+l*f-c*u,t[e+1]=l*g+h*u+c*d-o*f,t[e+2]=c*g+h*f+o*u-l*d,t[e+3]=h*g-o*d-l*u-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,i,s){return this._x=t,this._y=e,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const i=t._x,s=t._y,a=t._z,r=t._order,o=Math.cos,l=Math.sin,c=o(i/2),h=o(s/2),d=o(a/2),u=l(i/2),f=l(s/2),g=l(a/2);switch(r){case"XYZ":this._x=u*h*d+c*f*g,this._y=c*f*d-u*h*g,this._z=c*h*g+u*f*d,this._w=c*h*d-u*f*g;break;case"YXZ":this._x=u*h*d+c*f*g,this._y=c*f*d-u*h*g,this._z=c*h*g-u*f*d,this._w=c*h*d+u*f*g;break;case"ZXY":this._x=u*h*d-c*f*g,this._y=c*f*d+u*h*g,this._z=c*h*g+u*f*d,this._w=c*h*d-u*f*g;break;case"ZYX":this._x=u*h*d-c*f*g,this._y=c*f*d+u*h*g,this._z=c*h*g-u*f*d,this._w=c*h*d+u*f*g;break;case"YZX":this._x=u*h*d+c*f*g,this._y=c*f*d+u*h*g,this._z=c*h*g-u*f*d,this._w=c*h*d-u*f*g;break;case"XZY":this._x=u*h*d-c*f*g,this._y=c*f*d-u*h*g,this._z=c*h*g+u*f*d,this._w=c*h*d+u*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+r)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const i=e/2,s=Math.sin(i);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,i=e[0],s=e[4],a=e[8],r=e[1],o=e[5],l=e[9],c=e[2],h=e[6],d=e[10],u=i+o+d;if(u>0){const f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-l)*f,this._y=(a-c)*f,this._z=(r-s)*f}else if(i>o&&i>d){const f=2*Math.sqrt(1+i-o-d);this._w=(h-l)/f,this._x=.25*f,this._y=(s+r)/f,this._z=(a+c)/f}else if(o>d){const f=2*Math.sqrt(1+o-i-d);this._w=(a-c)/f,this._x=(s+r)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+d-i-o);this._w=(r-s)/f,this._x=(a+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let i=t.dot(e)+1;return i<Number.EPSILON?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(sn(this.dot(t),-1,1)))}rotateTowards(t,e){const i=this.angleTo(t);if(i===0)return this;const s=Math.min(1,e/i);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const i=t._x,s=t._y,a=t._z,r=t._w,o=e._x,l=e._y,c=e._z,h=e._w;return this._x=i*h+r*o+s*c-a*l,this._y=s*h+r*l+a*o-i*c,this._z=a*h+r*c+i*l-s*o,this._w=r*h-i*o-s*l-a*c,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const i=this._x,s=this._y,a=this._z,r=this._w;let o=r*t._w+i*t._x+s*t._y+a*t._z;if(o<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,o=-o):this.copy(t),o>=1)return this._w=r,this._x=i,this._y=s,this._z=a,this;const l=1-o*o;if(l<=Number.EPSILON){const f=1-e;return this._w=f*r+e*this._w,this._x=f*i+e*this._x,this._y=f*s+e*this._y,this._z=f*a+e*this._z,this.normalize(),this}const c=Math.sqrt(l),h=Math.atan2(c,o),d=Math.sin((1-e)*h)/c,u=Math.sin(e*h)/c;return this._w=r*d+this._w*u,this._x=i*d+this._x*u,this._y=s*d+this._y*u,this._z=a*d+this._z*u,this._onChangeCallback(),this}slerpQuaternions(t,e,i){return this.copy(t).slerp(e,i)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),a=Math.sqrt(i);return this.set(s*Math.sin(t),s*Math.cos(t),a*Math.sin(e),a*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class N{constructor(t=0,e=0,i=0){N.prototype.isVector3=!0,this.x=t,this.y=e,this.z=i}set(t,e,i){return i===void 0&&(i=this.z),this.x=t,this.y=e,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Ec.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Ec.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,i=this.y,s=this.z,a=t.elements;return this.x=a[0]*e+a[3]*i+a[6]*s,this.y=a[1]*e+a[4]*i+a[7]*s,this.z=a[2]*e+a[5]*i+a[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,i=this.y,s=this.z,a=t.elements,r=1/(a[3]*e+a[7]*i+a[11]*s+a[15]);return this.x=(a[0]*e+a[4]*i+a[8]*s+a[12])*r,this.y=(a[1]*e+a[5]*i+a[9]*s+a[13])*r,this.z=(a[2]*e+a[6]*i+a[10]*s+a[14])*r,this}applyQuaternion(t){const e=this.x,i=this.y,s=this.z,a=t.x,r=t.y,o=t.z,l=t.w,c=2*(r*s-o*i),h=2*(o*e-a*s),d=2*(a*i-r*e);return this.x=e+l*c+r*d-o*h,this.y=i+l*h+o*c-a*d,this.z=s+l*d+a*h-r*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,i=this.y,s=this.z,a=t.elements;return this.x=a[0]*e+a[4]*i+a[8]*s,this.y=a[1]*e+a[5]*i+a[9]*s,this.z=a[2]*e+a[6]*i+a[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(t,Math.min(e,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const i=t.x,s=t.y,a=t.z,r=e.x,o=e.y,l=e.z;return this.x=s*l-a*o,this.y=a*r-i*l,this.z=i*o-s*r,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const i=t.dot(this)/e;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return Hr.copy(this).projectOnVector(t),this.sub(Hr)}reflect(t){return this.sub(Hr.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos(sn(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y,s=this.z-t.z;return e*e+i*i+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,i){const s=Math.sin(e)*t;return this.x=s*Math.sin(i),this.y=Math.cos(e)*t,this.z=s*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,i){return this.x=t*Math.sin(e),this.y=i,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=i,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,i=Math.sqrt(1-e*e);return this.x=i*Math.cos(t),this.y=e,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Hr=new N,Ec=new ha;class da{constructor(t=new N(1/0,1/0,1/0),e=new N(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e+=3)this.expandByPoint(wn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,i=t.count;e<i;e++)this.expandByPoint(wn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const i=wn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const i=t.geometry;if(i!==void 0){const a=i.getAttribute("position");if(e===!0&&a!==void 0&&t.isInstancedMesh!==!0)for(let r=0,o=a.count;r<o;r++)t.isMesh===!0?t.getVertexPosition(r,wn):wn.fromBufferAttribute(a,r),wn.applyMatrix4(t.matrixWorld),this.expandByPoint(wn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Ma.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Ma.copy(i.boundingBox)),Ma.applyMatrix4(t.matrixWorld),this.union(Ma)}const s=t.children;for(let a=0,r=s.length;a<r;a++)this.expandByObject(s[a],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,wn),wn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,i;return t.normal.x>0?(e=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),e<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(bs),ya.subVectors(this.max,bs),Gi.subVectors(t.a,bs),Xi.subVectors(t.b,bs),Vi.subVectors(t.c,bs),ii.subVectors(Xi,Gi),si.subVectors(Vi,Xi),xi.subVectors(Gi,Vi);let e=[0,-ii.z,ii.y,0,-si.z,si.y,0,-xi.z,xi.y,ii.z,0,-ii.x,si.z,0,-si.x,xi.z,0,-xi.x,-ii.y,ii.x,0,-si.y,si.x,0,-xi.y,xi.x,0];return!Gr(e,Gi,Xi,Vi,ya)||(e=[1,0,0,0,1,0,0,0,1],!Gr(e,Gi,Xi,Vi,ya))?!1:(Sa.crossVectors(ii,si),e=[Sa.x,Sa.y,Sa.z],Gr(e,Gi,Xi,Vi,ya))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,wn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(wn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Xn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Xn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Xn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Xn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Xn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Xn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Xn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Xn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Xn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const Xn=[new N,new N,new N,new N,new N,new N,new N,new N],wn=new N,Ma=new da,Gi=new N,Xi=new N,Vi=new N,ii=new N,si=new N,xi=new N,bs=new N,ya=new N,Sa=new N,Mi=new N;function Gr(n,t,e,i,s){for(let a=0,r=n.length-3;a<=r;a+=3){Mi.fromArray(n,a);const o=s.x*Math.abs(Mi.x)+s.y*Math.abs(Mi.y)+s.z*Math.abs(Mi.z),l=t.dot(Mi),c=e.dot(Mi),h=i.dot(Mi);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}const $f=new da,Es=new N,Xr=new N;class kl{constructor(t=new N,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const i=this.center;e!==void 0?i.copy(e):$f.setFromPoints(t).getCenter(i);let s=0;for(let a=0,r=t.length;a<r;a++)s=Math.max(s,i.distanceToSquared(t[a]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const i=this.center.distanceToSquared(t);return e.copy(t),i>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Es.subVectors(t,this.center);const e=Es.lengthSq();if(e>this.radius*this.radius){const i=Math.sqrt(e),s=(i-this.radius)*.5;this.center.addScaledVector(Es,s/i),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Xr.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Es.copy(t.center).add(Xr)),this.expandByPoint(Es.copy(t.center).sub(Xr))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Vn=new N,Vr=new N,wa=new N,ai=new N,Wr=new N,ba=new N,Zr=new N;class Nd{constructor(t=new N,e=new N(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Vn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const i=e.dot(this.direction);return i<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=Vn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Vn.copy(this.origin).addScaledVector(this.direction,e),Vn.distanceToSquared(t))}distanceSqToSegment(t,e,i,s){Vr.copy(t).add(e).multiplyScalar(.5),wa.copy(e).sub(t).normalize(),ai.copy(this.origin).sub(Vr);const a=t.distanceTo(e)*.5,r=-this.direction.dot(wa),o=ai.dot(this.direction),l=-ai.dot(wa),c=ai.lengthSq(),h=Math.abs(1-r*r);let d,u,f,g;if(h>0)if(d=r*l-o,u=r*o-l,g=a*h,d>=0)if(u>=-g)if(u<=g){const _=1/h;d*=_,u*=_,f=d*(d+r*u+2*o)+u*(r*d+u+2*l)+c}else u=a,d=Math.max(0,-(r*u+o)),f=-d*d+u*(u+2*l)+c;else u=-a,d=Math.max(0,-(r*u+o)),f=-d*d+u*(u+2*l)+c;else u<=-g?(d=Math.max(0,-(-r*a+o)),u=d>0?-a:Math.min(Math.max(-a,-l),a),f=-d*d+u*(u+2*l)+c):u<=g?(d=0,u=Math.min(Math.max(-a,-l),a),f=u*(u+2*l)+c):(d=Math.max(0,-(r*a+o)),u=d>0?a:Math.min(Math.max(-a,-l),a),f=-d*d+u*(u+2*l)+c);else u=r>0?-a:a,d=Math.max(0,-(r*u+o)),f=-d*d+u*(u+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(Vr).addScaledVector(wa,u),f}intersectSphere(t,e){Vn.subVectors(t.center,this.origin);const i=Vn.dot(this.direction),s=Vn.dot(Vn)-i*i,a=t.radius*t.radius;if(s>a)return null;const r=Math.sqrt(a-s),o=i-r,l=i+r;return l<0?null:o<0?this.at(l,e):this.at(o,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(t.normal)+t.constant)/e;return i>=0?i:null}intersectPlane(t,e){const i=this.distanceToPlane(t);return i===null?null:this.at(i,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let i,s,a,r,o,l;const c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(i=(t.min.x-u.x)*c,s=(t.max.x-u.x)*c):(i=(t.max.x-u.x)*c,s=(t.min.x-u.x)*c),h>=0?(a=(t.min.y-u.y)*h,r=(t.max.y-u.y)*h):(a=(t.max.y-u.y)*h,r=(t.min.y-u.y)*h),i>r||a>s||((a>i||isNaN(i))&&(i=a),(r<s||isNaN(s))&&(s=r),d>=0?(o=(t.min.z-u.z)*d,l=(t.max.z-u.z)*d):(o=(t.max.z-u.z)*d,l=(t.min.z-u.z)*d),i>l||o>s)||((o>i||i!==i)&&(i=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(i>=0?i:s,e)}intersectsBox(t){return this.intersectBox(t,Vn)!==null}intersectTriangle(t,e,i,s,a){Wr.subVectors(e,t),ba.subVectors(i,t),Zr.crossVectors(Wr,ba);let r=this.direction.dot(Zr),o;if(r>0){if(s)return null;o=1}else if(r<0)o=-1,r=-r;else return null;ai.subVectors(this.origin,t);const l=o*this.direction.dot(ba.crossVectors(ai,ba));if(l<0)return null;const c=o*this.direction.dot(Wr.cross(ai));if(c<0||l+c>r)return null;const h=-o*ai.dot(Zr);return h<0?null:this.at(h/r,a)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ue{constructor(t,e,i,s,a,r,o,l,c,h,d,u,f,g,_,m){ue.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,i,s,a,r,o,l,c,h,d,u,f,g,_,m)}set(t,e,i,s,a,r,o,l,c,h,d,u,f,g,_,m){const p=this.elements;return p[0]=t,p[4]=e,p[8]=i,p[12]=s,p[1]=a,p[5]=r,p[9]=o,p[13]=l,p[2]=c,p[6]=h,p[10]=d,p[14]=u,p[3]=f,p[7]=g,p[11]=_,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ue().fromArray(this.elements)}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],e[9]=i[9],e[10]=i[10],e[11]=i[11],e[12]=i[12],e[13]=i[13],e[14]=i[14],e[15]=i[15],this}copyPosition(t){const e=this.elements,i=t.elements;return e[12]=i[12],e[13]=i[13],e[14]=i[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,i){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(t,e,i){return this.set(t.x,e.x,i.x,0,t.y,e.y,i.y,0,t.z,e.z,i.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,i=t.elements,s=1/Wi.setFromMatrixColumn(t,0).length(),a=1/Wi.setFromMatrixColumn(t,1).length(),r=1/Wi.setFromMatrixColumn(t,2).length();return e[0]=i[0]*s,e[1]=i[1]*s,e[2]=i[2]*s,e[3]=0,e[4]=i[4]*a,e[5]=i[5]*a,e[6]=i[6]*a,e[7]=0,e[8]=i[8]*r,e[9]=i[9]*r,e[10]=i[10]*r,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,i=t.x,s=t.y,a=t.z,r=Math.cos(i),o=Math.sin(i),l=Math.cos(s),c=Math.sin(s),h=Math.cos(a),d=Math.sin(a);if(t.order==="XYZ"){const u=r*h,f=r*d,g=o*h,_=o*d;e[0]=l*h,e[4]=-l*d,e[8]=c,e[1]=f+g*c,e[5]=u-_*c,e[9]=-o*l,e[2]=_-u*c,e[6]=g+f*c,e[10]=r*l}else if(t.order==="YXZ"){const u=l*h,f=l*d,g=c*h,_=c*d;e[0]=u+_*o,e[4]=g*o-f,e[8]=r*c,e[1]=r*d,e[5]=r*h,e[9]=-o,e[2]=f*o-g,e[6]=_+u*o,e[10]=r*l}else if(t.order==="ZXY"){const u=l*h,f=l*d,g=c*h,_=c*d;e[0]=u-_*o,e[4]=-r*d,e[8]=g+f*o,e[1]=f+g*o,e[5]=r*h,e[9]=_-u*o,e[2]=-r*c,e[6]=o,e[10]=r*l}else if(t.order==="ZYX"){const u=r*h,f=r*d,g=o*h,_=o*d;e[0]=l*h,e[4]=g*c-f,e[8]=u*c+_,e[1]=l*d,e[5]=_*c+u,e[9]=f*c-g,e[2]=-c,e[6]=o*l,e[10]=r*l}else if(t.order==="YZX"){const u=r*l,f=r*c,g=o*l,_=o*c;e[0]=l*h,e[4]=_-u*d,e[8]=g*d+f,e[1]=d,e[5]=r*h,e[9]=-o*h,e[2]=-c*h,e[6]=f*d+g,e[10]=u-_*d}else if(t.order==="XZY"){const u=r*l,f=r*c,g=o*l,_=o*c;e[0]=l*h,e[4]=-d,e[8]=c*h,e[1]=u*d+_,e[5]=r*h,e[9]=f*d-g,e[2]=g*d-f,e[6]=o*h,e[10]=_*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Kf,t,jf)}lookAt(t,e,i){const s=this.elements;return dn.subVectors(t,e),dn.lengthSq()===0&&(dn.z=1),dn.normalize(),ri.crossVectors(i,dn),ri.lengthSq()===0&&(Math.abs(i.z)===1?dn.x+=1e-4:dn.z+=1e-4,dn.normalize(),ri.crossVectors(i,dn)),ri.normalize(),Ea.crossVectors(dn,ri),s[0]=ri.x,s[4]=Ea.x,s[8]=dn.x,s[1]=ri.y,s[5]=Ea.y,s[9]=dn.y,s[2]=ri.z,s[6]=Ea.z,s[10]=dn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,s=e.elements,a=this.elements,r=i[0],o=i[4],l=i[8],c=i[12],h=i[1],d=i[5],u=i[9],f=i[13],g=i[2],_=i[6],m=i[10],p=i[14],S=i[3],y=i[7],b=i[11],C=i[15],E=s[0],T=s[4],L=s[8],w=s[12],x=s[1],R=s[5],O=s[9],F=s[13],H=s[2],V=s[6],G=s[10],q=s[14],X=s[3],lt=s[7],nt=s[11],rt=s[15];return a[0]=r*E+o*x+l*H+c*X,a[4]=r*T+o*R+l*V+c*lt,a[8]=r*L+o*O+l*G+c*nt,a[12]=r*w+o*F+l*q+c*rt,a[1]=h*E+d*x+u*H+f*X,a[5]=h*T+d*R+u*V+f*lt,a[9]=h*L+d*O+u*G+f*nt,a[13]=h*w+d*F+u*q+f*rt,a[2]=g*E+_*x+m*H+p*X,a[6]=g*T+_*R+m*V+p*lt,a[10]=g*L+_*O+m*G+p*nt,a[14]=g*w+_*F+m*q+p*rt,a[3]=S*E+y*x+b*H+C*X,a[7]=S*T+y*R+b*V+C*lt,a[11]=S*L+y*O+b*G+C*nt,a[15]=S*w+y*F+b*q+C*rt,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[4],s=t[8],a=t[12],r=t[1],o=t[5],l=t[9],c=t[13],h=t[2],d=t[6],u=t[10],f=t[14],g=t[3],_=t[7],m=t[11],p=t[15];return g*(+a*l*d-s*c*d-a*o*u+i*c*u+s*o*f-i*l*f)+_*(+e*l*f-e*c*u+a*r*u-s*r*f+s*c*h-a*l*h)+m*(+e*c*d-e*o*f-a*r*d+i*r*f+a*o*h-i*c*h)+p*(-s*o*h-e*l*d+e*o*u+s*r*d-i*r*u+i*l*h)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,i){const s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=i),this}invert(){const t=this.elements,e=t[0],i=t[1],s=t[2],a=t[3],r=t[4],o=t[5],l=t[6],c=t[7],h=t[8],d=t[9],u=t[10],f=t[11],g=t[12],_=t[13],m=t[14],p=t[15],S=d*m*c-_*u*c+_*l*f-o*m*f-d*l*p+o*u*p,y=g*u*c-h*m*c-g*l*f+r*m*f+h*l*p-r*u*p,b=h*_*c-g*d*c+g*o*f-r*_*f-h*o*p+r*d*p,C=g*d*l-h*_*l-g*o*u+r*_*u+h*o*m-r*d*m,E=e*S+i*y+s*b+a*C;if(E===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const T=1/E;return t[0]=S*T,t[1]=(_*u*a-d*m*a-_*s*f+i*m*f+d*s*p-i*u*p)*T,t[2]=(o*m*a-_*l*a+_*s*c-i*m*c-o*s*p+i*l*p)*T,t[3]=(d*l*a-o*u*a-d*s*c+i*u*c+o*s*f-i*l*f)*T,t[4]=y*T,t[5]=(h*m*a-g*u*a+g*s*f-e*m*f-h*s*p+e*u*p)*T,t[6]=(g*l*a-r*m*a-g*s*c+e*m*c+r*s*p-e*l*p)*T,t[7]=(r*u*a-h*l*a+h*s*c-e*u*c-r*s*f+e*l*f)*T,t[8]=b*T,t[9]=(g*d*a-h*_*a-g*i*f+e*_*f+h*i*p-e*d*p)*T,t[10]=(r*_*a-g*o*a+g*i*c-e*_*c-r*i*p+e*o*p)*T,t[11]=(h*o*a-r*d*a-h*i*c+e*d*c+r*i*f-e*o*f)*T,t[12]=C*T,t[13]=(h*_*s-g*d*s+g*i*u-e*_*u-h*i*m+e*d*m)*T,t[14]=(g*o*s-r*_*s-g*i*l+e*_*l+r*i*m-e*o*m)*T,t[15]=(r*d*s-h*o*s+h*i*l-e*d*l-r*i*u+e*o*u)*T,this}scale(t){const e=this.elements,i=t.x,s=t.y,a=t.z;return e[0]*=i,e[4]*=s,e[8]*=a,e[1]*=i,e[5]*=s,e[9]*=a,e[2]*=i,e[6]*=s,e[10]*=a,e[3]*=i,e[7]*=s,e[11]*=a,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,i,s))}makeTranslation(t,e,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,i,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,e,-i,0,0,i,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,0,i,0,0,1,0,0,-i,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,0,i,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const i=Math.cos(e),s=Math.sin(e),a=1-i,r=t.x,o=t.y,l=t.z,c=a*r,h=a*o;return this.set(c*r+i,c*o-s*l,c*l+s*o,0,c*o+s*l,h*o+i,h*l-s*r,0,c*l-s*o,h*l+s*r,a*l*l+i,0,0,0,0,1),this}makeScale(t,e,i){return this.set(t,0,0,0,0,e,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,e,i,s,a,r){return this.set(1,i,a,0,t,1,r,0,e,s,1,0,0,0,0,1),this}compose(t,e,i){const s=this.elements,a=e._x,r=e._y,o=e._z,l=e._w,c=a+a,h=r+r,d=o+o,u=a*c,f=a*h,g=a*d,_=r*h,m=r*d,p=o*d,S=l*c,y=l*h,b=l*d,C=i.x,E=i.y,T=i.z;return s[0]=(1-(_+p))*C,s[1]=(f+b)*C,s[2]=(g-y)*C,s[3]=0,s[4]=(f-b)*E,s[5]=(1-(u+p))*E,s[6]=(m+S)*E,s[7]=0,s[8]=(g+y)*T,s[9]=(m-S)*T,s[10]=(1-(u+_))*T,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,i){const s=this.elements;let a=Wi.set(s[0],s[1],s[2]).length();const r=Wi.set(s[4],s[5],s[6]).length(),o=Wi.set(s[8],s[9],s[10]).length();this.determinant()<0&&(a=-a),t.x=s[12],t.y=s[13],t.z=s[14],bn.copy(this);const c=1/a,h=1/r,d=1/o;return bn.elements[0]*=c,bn.elements[1]*=c,bn.elements[2]*=c,bn.elements[4]*=h,bn.elements[5]*=h,bn.elements[6]*=h,bn.elements[8]*=d,bn.elements[9]*=d,bn.elements[10]*=d,e.setFromRotationMatrix(bn),i.x=a,i.y=r,i.z=o,this}makePerspective(t,e,i,s,a,r,o=jn){const l=this.elements,c=2*a/(e-t),h=2*a/(i-s),d=(e+t)/(e-t),u=(i+s)/(i-s);let f,g;if(o===jn)f=-(r+a)/(r-a),g=-2*r*a/(r-a);else if(o===rr)f=-r/(r-a),g=-r*a/(r-a);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=c,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=h,l[9]=u,l[13]=0,l[2]=0,l[6]=0,l[10]=f,l[14]=g,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,i,s,a,r,o=jn){const l=this.elements,c=1/(e-t),h=1/(i-s),d=1/(r-a),u=(e+t)*c,f=(i+s)*h;let g,_;if(o===jn)g=(r+a)*d,_=-2*d;else if(o===rr)g=a*d,_=-1*d;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-u,l[1]=0,l[5]=2*h,l[9]=0,l[13]=-f,l[2]=0,l[6]=0,l[10]=_,l[14]=-g,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){const e=this.elements,i=t.elements;for(let s=0;s<16;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<16;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t[e+9]=i[9],t[e+10]=i[10],t[e+11]=i[11],t[e+12]=i[12],t[e+13]=i[13],t[e+14]=i[14],t[e+15]=i[15],t}}const Wi=new N,bn=new ue,Kf=new N(0,0,0),jf=new N(1,1,1),ri=new N,Ea=new N,dn=new N,Tc=new ue,Ac=new ha;class Rn{constructor(t=0,e=0,i=0,s=Rn.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=i,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,i,s=this._order){return this._x=t,this._y=e,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,i=!0){const s=t.elements,a=s[0],r=s[4],o=s[8],l=s[1],c=s[5],h=s[9],d=s[2],u=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin(sn(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-r,a)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-sn(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,a),this._z=0);break;case"ZXY":this._x=Math.asin(sn(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-r,c)):(this._y=0,this._z=Math.atan2(l,a));break;case"ZYX":this._y=Math.asin(-sn(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(l,a)):(this._x=0,this._z=Math.atan2(-r,c));break;case"YZX":this._z=Math.asin(sn(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,a)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-sn(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(o,a)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,i){return Tc.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Tc,e,i)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Ac.setFromEuler(this),this.setFromQuaternion(Ac,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Rn.DEFAULT_ORDER="XYZ";class Bl{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let Jf=0;const Cc=new N,Zi=new ha,Wn=new ue,Ta=new N,Ts=new N,Qf=new N,tp=new ha,Rc=new N(1,0,0),Pc=new N(0,1,0),Lc=new N(0,0,1),Ic={type:"added"},ep={type:"removed"},Yi={type:"childadded",child:null},Yr={type:"childremoved",child:null};class je extends xs{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Jf++}),this.uuid=ca(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=je.DEFAULT_UP.clone();const t=new N,e=new Rn,i=new ha,s=new N(1,1,1);function a(){i.setFromEuler(e,!1)}function r(){e.setFromQuaternion(i,void 0,!1)}e._onChange(a),i._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ue},normalMatrix:{value:new Nt}}),this.matrix=new ue,this.matrixWorld=new ue,this.matrixAutoUpdate=je.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=je.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Bl,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Zi.setFromAxisAngle(t,e),this.quaternion.multiply(Zi),this}rotateOnWorldAxis(t,e){return Zi.setFromAxisAngle(t,e),this.quaternion.premultiply(Zi),this}rotateX(t){return this.rotateOnAxis(Rc,t)}rotateY(t){return this.rotateOnAxis(Pc,t)}rotateZ(t){return this.rotateOnAxis(Lc,t)}translateOnAxis(t,e){return Cc.copy(t).applyQuaternion(this.quaternion),this.position.add(Cc.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Rc,t)}translateY(t){return this.translateOnAxis(Pc,t)}translateZ(t){return this.translateOnAxis(Lc,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Wn.copy(this.matrixWorld).invert())}lookAt(t,e,i){t.isVector3?Ta.copy(t):Ta.set(t,e,i);const s=this.parent;this.updateWorldMatrix(!0,!1),Ts.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Wn.lookAt(Ts,Ta,this.up):Wn.lookAt(Ta,Ts,this.up),this.quaternion.setFromRotationMatrix(Wn),s&&(Wn.extractRotation(s.matrixWorld),Zi.setFromRotationMatrix(Wn),this.quaternion.premultiply(Zi.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Ic),Yi.child=t,this.dispatchEvent(Yi),Yi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(ep),Yr.child=t,this.dispatchEvent(Yr),Yr.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Wn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Wn.multiply(t.parent.matrixWorld)),t.applyMatrix4(Wn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Ic),Yi.child=t,this.dispatchEvent(Yi),Yi.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let i=0,s=this.children.length;i<s;i++){const r=this.children[i].getObjectByProperty(t,e);if(r!==void 0)return r}}getObjectsByProperty(t,e,i=[]){this[t]===e&&i.push(this);const s=this.children;for(let a=0,r=s.length;a<r;a++)s[a].getObjectsByProperty(t,e,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ts,t,Qf),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ts,tp,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].updateMatrixWorld(t)}updateWorldMatrix(t,e){const i=this.parent;if(t===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const s=this.children;for(let a=0,r=s.length;a<r;a++)s[a].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",i={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.visibility=this._visibility,s.active=this._active,s.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.geometryCount=this._geometryCount,s.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere={center:s.boundingSphere.center.toArray(),radius:s.boundingSphere.radius}),this.boundingBox!==null&&(s.boundingBox={min:s.boundingBox.min.toArray(),max:s.boundingBox.max.toArray()}));function a(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=a(t.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const d=l[c];a(t.shapes,d)}else a(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(a(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(a(t.materials,this.material[l]));s.material=o}else s.material=a(t.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];s.animations.push(a(t.animations,l))}}if(e){const o=r(t.geometries),l=r(t.materials),c=r(t.textures),h=r(t.images),d=r(t.shapes),u=r(t.skeletons),f=r(t.animations),g=r(t.nodes);o.length>0&&(i.geometries=o),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),h.length>0&&(i.images=h),d.length>0&&(i.shapes=d),u.length>0&&(i.skeletons=u),f.length>0&&(i.animations=f),g.length>0&&(i.nodes=g)}return i.object=s,i;function r(o){const l=[];for(const c in o){const h=o[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let i=0;i<t.children.length;i++){const s=t.children[i];this.add(s.clone())}return this}}je.DEFAULT_UP=new N(0,1,0);je.DEFAULT_MATRIX_AUTO_UPDATE=!0;je.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const En=new N,Zn=new N,qr=new N,Yn=new N,qi=new N,$i=new N,Dc=new N,$r=new N,Kr=new N,jr=new N;class Nn{constructor(t=new N,e=new N,i=new N){this.a=t,this.b=e,this.c=i}static getNormal(t,e,i,s){s.subVectors(i,e),En.subVectors(t,e),s.cross(En);const a=s.lengthSq();return a>0?s.multiplyScalar(1/Math.sqrt(a)):s.set(0,0,0)}static getBarycoord(t,e,i,s,a){En.subVectors(s,e),Zn.subVectors(i,e),qr.subVectors(t,e);const r=En.dot(En),o=En.dot(Zn),l=En.dot(qr),c=Zn.dot(Zn),h=Zn.dot(qr),d=r*c-o*o;if(d===0)return a.set(0,0,0),null;const u=1/d,f=(c*l-o*h)*u,g=(r*h-o*l)*u;return a.set(1-f-g,g,f)}static containsPoint(t,e,i,s){return this.getBarycoord(t,e,i,s,Yn)===null?!1:Yn.x>=0&&Yn.y>=0&&Yn.x+Yn.y<=1}static getInterpolation(t,e,i,s,a,r,o,l){return this.getBarycoord(t,e,i,s,Yn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(a,Yn.x),l.addScaledVector(r,Yn.y),l.addScaledVector(o,Yn.z),l)}static isFrontFacing(t,e,i,s){return En.subVectors(i,e),Zn.subVectors(t,e),En.cross(Zn).dot(s)<0}set(t,e,i){return this.a.copy(t),this.b.copy(e),this.c.copy(i),this}setFromPointsAndIndices(t,e,i,s){return this.a.copy(t[e]),this.b.copy(t[i]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,i,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return En.subVectors(this.c,this.b),Zn.subVectors(this.a,this.b),En.cross(Zn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return Nn.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return Nn.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,i,s,a){return Nn.getInterpolation(t,this.a,this.b,this.c,e,i,s,a)}containsPoint(t){return Nn.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return Nn.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const i=this.a,s=this.b,a=this.c;let r,o;qi.subVectors(s,i),$i.subVectors(a,i),$r.subVectors(t,i);const l=qi.dot($r),c=$i.dot($r);if(l<=0&&c<=0)return e.copy(i);Kr.subVectors(t,s);const h=qi.dot(Kr),d=$i.dot(Kr);if(h>=0&&d<=h)return e.copy(s);const u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return r=l/(l-h),e.copy(i).addScaledVector(qi,r);jr.subVectors(t,a);const f=qi.dot(jr),g=$i.dot(jr);if(g>=0&&f<=g)return e.copy(a);const _=f*c-l*g;if(_<=0&&c>=0&&g<=0)return o=c/(c-g),e.copy(i).addScaledVector($i,o);const m=h*g-f*d;if(m<=0&&d-h>=0&&f-g>=0)return Dc.subVectors(a,s),o=(d-h)/(d-h+(f-g)),e.copy(s).addScaledVector(Dc,o);const p=1/(m+_+u);return r=_*p,o=u*p,e.copy(i).addScaledVector(qi,r).addScaledVector($i,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const Od={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},oi={h:0,s:0,l:0},Aa={h:0,s:0,l:0};function Jr(n,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?n+(t-n)*6*e:e<1/2?t:e<2/3?n+(t-n)*6*(2/3-e):n}class Lt{constructor(t,e,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,i)}set(t,e,i){if(e===void 0&&i===void 0){const s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=In){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,te.toWorkingColorSpace(this,e),this}setRGB(t,e,i,s=te.workingColorSpace){return this.r=t,this.g=e,this.b=i,te.toWorkingColorSpace(this,s),this}setHSL(t,e,i,s=te.workingColorSpace){if(t=Bf(t,1),e=sn(e,0,1),i=sn(i,0,1),e===0)this.r=this.g=this.b=i;else{const a=i<=.5?i*(1+e):i+e-i*e,r=2*i-a;this.r=Jr(r,a,t+1/3),this.g=Jr(r,a,t),this.b=Jr(r,a,t-1/3)}return te.toWorkingColorSpace(this,s),this}setStyle(t,e=In){function i(a){a!==void 0&&parseFloat(a)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let a;const r=s[1],o=s[2];switch(r){case"rgb":case"rgba":if(a=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(a[4]),this.setRGB(Math.min(255,parseInt(a[1],10))/255,Math.min(255,parseInt(a[2],10))/255,Math.min(255,parseInt(a[3],10))/255,e);if(a=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(a[4]),this.setRGB(Math.min(100,parseInt(a[1],10))/100,Math.min(100,parseInt(a[2],10))/100,Math.min(100,parseInt(a[3],10))/100,e);break;case"hsl":case"hsla":if(a=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(a[4]),this.setHSL(parseFloat(a[1])/360,parseFloat(a[2])/100,parseFloat(a[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){const a=s[1],r=a.length;if(r===3)return this.setRGB(parseInt(a.charAt(0),16)/15,parseInt(a.charAt(1),16)/15,parseInt(a.charAt(2),16)/15,e);if(r===6)return this.setHex(parseInt(a,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=In){const i=Od[t.toLowerCase()];return i!==void 0?this.setHex(i,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=us(t.r),this.g=us(t.g),this.b=us(t.b),this}copyLinearToSRGB(t){return this.r=kr(t.r),this.g=kr(t.g),this.b=kr(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=In){return te.fromWorkingColorSpace(Ze.copy(this),t),Math.round(sn(Ze.r*255,0,255))*65536+Math.round(sn(Ze.g*255,0,255))*256+Math.round(sn(Ze.b*255,0,255))}getHexString(t=In){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=te.workingColorSpace){te.fromWorkingColorSpace(Ze.copy(this),e);const i=Ze.r,s=Ze.g,a=Ze.b,r=Math.max(i,s,a),o=Math.min(i,s,a);let l,c;const h=(o+r)/2;if(o===r)l=0,c=0;else{const d=r-o;switch(c=h<=.5?d/(r+o):d/(2-r-o),r){case i:l=(s-a)/d+(s<a?6:0);break;case s:l=(a-i)/d+2;break;case a:l=(i-s)/d+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=te.workingColorSpace){return te.fromWorkingColorSpace(Ze.copy(this),e),t.r=Ze.r,t.g=Ze.g,t.b=Ze.b,t}getStyle(t=In){te.fromWorkingColorSpace(Ze.copy(this),t);const e=Ze.r,i=Ze.g,s=Ze.b;return t!==In?`color(${t} ${e.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(t,e,i){return this.getHSL(oi),this.setHSL(oi.h+t,oi.s+e,oi.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,i){return this.r=t.r+(e.r-t.r)*i,this.g=t.g+(e.g-t.g)*i,this.b=t.b+(e.b-t.b)*i,this}lerpHSL(t,e){this.getHSL(oi),t.getHSL(Aa);const i=Fr(oi.h,Aa.h,e),s=Fr(oi.s,Aa.s,e),a=Fr(oi.l,Aa.l,e);return this.setHSL(i,s,a),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,i=this.g,s=this.b,a=t.elements;return this.r=a[0]*e+a[3]*i+a[6]*s,this.g=a[1]*e+a[4]*i+a[7]*s,this.b=a[2]*e+a[5]*i+a[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Ze=new Lt;Lt.NAMES=Od;let np=0;class Ms extends xs{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:np++}),this.uuid=ca(),this.name="",this.type="Material",this.blending=hs,this.side=fi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=_o,this.blendDst=vo,this.blendEquation=Ri,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Lt(0,0,0),this.blendAlpha=0,this.depthFunc=nr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=xc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Bi,this.stencilZFail=Bi,this.stencilZPass=Bi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const i=t[e];if(i===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[e]=i}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==hs&&(i.blending=this.blending),this.side!==fi&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==_o&&(i.blendSrc=this.blendSrc),this.blendDst!==vo&&(i.blendDst=this.blendDst),this.blendEquation!==Ri&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==nr&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==xc&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Bi&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Bi&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Bi&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(a){const r=[];for(const o in a){const l=a[o];delete l.metadata,r.push(l)}return r}if(e){const a=s(t.textures),r=s(t.images);a.length>0&&(i.textures=a),r.length>0&&(i.images=r)}return i}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let i=null;if(e!==null){const s=e.length;i=new Array(s);for(let a=0;a!==s;++a)i[a]=e[a].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class Qe extends Ms{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Lt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Rn,this.combine=Pl,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const Ce=new N,Ca=new Ht;class zn{constructor(t,e,i=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=i,this.usage=Mc,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=Kn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}get updateRange(){return qs("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,i){t*=this.itemSize,i*=e.itemSize;for(let s=0,a=this.itemSize;s<a;s++)this.array[t+s]=e.array[i+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,i=this.count;e<i;e++)Ca.fromBufferAttribute(this,e),Ca.applyMatrix3(t),this.setXY(e,Ca.x,Ca.y);else if(this.itemSize===3)for(let e=0,i=this.count;e<i;e++)Ce.fromBufferAttribute(this,e),Ce.applyMatrix3(t),this.setXYZ(e,Ce.x,Ce.y,Ce.z);return this}applyMatrix4(t){for(let e=0,i=this.count;e<i;e++)Ce.fromBufferAttribute(this,e),Ce.applyMatrix4(t),this.setXYZ(e,Ce.x,Ce.y,Ce.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)Ce.fromBufferAttribute(this,e),Ce.applyNormalMatrix(t),this.setXYZ(e,Ce.x,Ce.y,Ce.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)Ce.fromBufferAttribute(this,e),Ce.transformDirection(t),this.setXYZ(e,Ce.x,Ce.y,Ce.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let i=this.array[t*this.itemSize+e];return this.normalized&&(i=Ss(i,this.array)),i}setComponent(t,e,i){return this.normalized&&(i=nn(i,this.array)),this.array[t*this.itemSize+e]=i,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Ss(e,this.array)),e}setX(t,e){return this.normalized&&(e=nn(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Ss(e,this.array)),e}setY(t,e){return this.normalized&&(e=nn(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Ss(e,this.array)),e}setZ(t,e){return this.normalized&&(e=nn(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Ss(e,this.array)),e}setW(t,e){return this.normalized&&(e=nn(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,i){return t*=this.itemSize,this.normalized&&(e=nn(e,this.array),i=nn(i,this.array)),this.array[t+0]=e,this.array[t+1]=i,this}setXYZ(t,e,i,s){return t*=this.itemSize,this.normalized&&(e=nn(e,this.array),i=nn(i,this.array),s=nn(s,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this}setXYZW(t,e,i,s,a){return t*=this.itemSize,this.normalized&&(e=nn(e,this.array),i=nn(i,this.array),s=nn(s,this.array),a=nn(a,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this.array[t+3]=a,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Mc&&(t.usage=this.usage),t}}class Fd extends zn{constructor(t,e,i){super(new Uint16Array(t),e,i)}}class zd extends zn{constructor(t,e,i){super(new Uint32Array(t),e,i)}}class Be extends zn{constructor(t,e,i){super(new Float32Array(t),e,i)}}let ip=0;const _n=new ue,Qr=new je,Ki=new N,un=new da,As=new da,Ne=new N;class Pn extends xs{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:ip++}),this.uuid=ca(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Id(t)?zd:Fd)(t,1):this.index=t,this}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,i=0){this.groups.push({start:t,count:e,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const a=new Nt().getNormalMatrix(t);i.applyNormalMatrix(a),i.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return _n.makeRotationFromQuaternion(t),this.applyMatrix4(_n),this}rotateX(t){return _n.makeRotationX(t),this.applyMatrix4(_n),this}rotateY(t){return _n.makeRotationY(t),this.applyMatrix4(_n),this}rotateZ(t){return _n.makeRotationZ(t),this.applyMatrix4(_n),this}translate(t,e,i){return _n.makeTranslation(t,e,i),this.applyMatrix4(_n),this}scale(t,e,i){return _n.makeScale(t,e,i),this.applyMatrix4(_n),this}lookAt(t){return Qr.lookAt(t),Qr.updateMatrix(),this.applyMatrix4(Qr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ki).negate(),this.translate(Ki.x,Ki.y,Ki.z),this}setFromPoints(t){const e=[];for(let i=0,s=t.length;i<s;i++){const a=t[i];e.push(a.x,a.y,a.z||0)}return this.setAttribute("position",new Be(e,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new da);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new N(-1/0,-1/0,-1/0),new N(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let i=0,s=e.length;i<s;i++){const a=e[i];un.setFromBufferAttribute(a),this.morphTargetsRelative?(Ne.addVectors(this.boundingBox.min,un.min),this.boundingBox.expandByPoint(Ne),Ne.addVectors(this.boundingBox.max,un.max),this.boundingBox.expandByPoint(Ne)):(this.boundingBox.expandByPoint(un.min),this.boundingBox.expandByPoint(un.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new kl);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new N,1/0);return}if(t){const i=this.boundingSphere.center;if(un.setFromBufferAttribute(t),e)for(let a=0,r=e.length;a<r;a++){const o=e[a];As.setFromBufferAttribute(o),this.morphTargetsRelative?(Ne.addVectors(un.min,As.min),un.expandByPoint(Ne),Ne.addVectors(un.max,As.max),un.expandByPoint(Ne)):(un.expandByPoint(As.min),un.expandByPoint(As.max))}un.getCenter(i);let s=0;for(let a=0,r=t.count;a<r;a++)Ne.fromBufferAttribute(t,a),s=Math.max(s,i.distanceToSquared(Ne));if(e)for(let a=0,r=e.length;a<r;a++){const o=e[a],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)Ne.fromBufferAttribute(o,c),l&&(Ki.fromBufferAttribute(t,c),Ne.add(Ki)),s=Math.max(s,i.distanceToSquared(Ne))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=e.position,s=e.normal,a=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new zn(new Float32Array(4*i.count),4));const r=this.getAttribute("tangent"),o=[],l=[];for(let L=0;L<i.count;L++)o[L]=new N,l[L]=new N;const c=new N,h=new N,d=new N,u=new Ht,f=new Ht,g=new Ht,_=new N,m=new N;function p(L,w,x){c.fromBufferAttribute(i,L),h.fromBufferAttribute(i,w),d.fromBufferAttribute(i,x),u.fromBufferAttribute(a,L),f.fromBufferAttribute(a,w),g.fromBufferAttribute(a,x),h.sub(c),d.sub(c),f.sub(u),g.sub(u);const R=1/(f.x*g.y-g.x*f.y);isFinite(R)&&(_.copy(h).multiplyScalar(g.y).addScaledVector(d,-f.y).multiplyScalar(R),m.copy(d).multiplyScalar(f.x).addScaledVector(h,-g.x).multiplyScalar(R),o[L].add(_),o[w].add(_),o[x].add(_),l[L].add(m),l[w].add(m),l[x].add(m))}let S=this.groups;S.length===0&&(S=[{start:0,count:t.count}]);for(let L=0,w=S.length;L<w;++L){const x=S[L],R=x.start,O=x.count;for(let F=R,H=R+O;F<H;F+=3)p(t.getX(F+0),t.getX(F+1),t.getX(F+2))}const y=new N,b=new N,C=new N,E=new N;function T(L){C.fromBufferAttribute(s,L),E.copy(C);const w=o[L];y.copy(w),y.sub(C.multiplyScalar(C.dot(w))).normalize(),b.crossVectors(E,w);const R=b.dot(l[L])<0?-1:1;r.setXYZW(L,y.x,y.y,y.z,R)}for(let L=0,w=S.length;L<w;++L){const x=S[L],R=x.start,O=x.count;for(let F=R,H=R+O;F<H;F+=3)T(t.getX(F+0)),T(t.getX(F+1)),T(t.getX(F+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new zn(new Float32Array(e.count*3),3),this.setAttribute("normal",i);else for(let u=0,f=i.count;u<f;u++)i.setXYZ(u,0,0,0);const s=new N,a=new N,r=new N,o=new N,l=new N,c=new N,h=new N,d=new N;if(t)for(let u=0,f=t.count;u<f;u+=3){const g=t.getX(u+0),_=t.getX(u+1),m=t.getX(u+2);s.fromBufferAttribute(e,g),a.fromBufferAttribute(e,_),r.fromBufferAttribute(e,m),h.subVectors(r,a),d.subVectors(s,a),h.cross(d),o.fromBufferAttribute(i,g),l.fromBufferAttribute(i,_),c.fromBufferAttribute(i,m),o.add(h),l.add(h),c.add(h),i.setXYZ(g,o.x,o.y,o.z),i.setXYZ(_,l.x,l.y,l.z),i.setXYZ(m,c.x,c.y,c.z)}else for(let u=0,f=e.count;u<f;u+=3)s.fromBufferAttribute(e,u+0),a.fromBufferAttribute(e,u+1),r.fromBufferAttribute(e,u+2),h.subVectors(r,a),d.subVectors(s,a),h.cross(d),i.setXYZ(u+0,h.x,h.y,h.z),i.setXYZ(u+1,h.x,h.y,h.z),i.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,i=t.count;e<i;e++)Ne.fromBufferAttribute(t,e),Ne.normalize(),t.setXYZ(e,Ne.x,Ne.y,Ne.z)}toNonIndexed(){function t(o,l){const c=o.array,h=o.itemSize,d=o.normalized,u=new c.constructor(l.length*h);let f=0,g=0;for(let _=0,m=l.length;_<m;_++){o.isInterleavedBufferAttribute?f=l[_]*o.data.stride+o.offset:f=l[_]*h;for(let p=0;p<h;p++)u[g++]=c[f++]}return new zn(u,h,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new Pn,i=this.index.array,s=this.attributes;for(const o in s){const l=s[o],c=t(l,i);e.setAttribute(o,c)}const a=this.morphAttributes;for(const o in a){const l=[],c=a[o];for(let h=0,d=c.length;h<d;h++){const u=c[h],f=t(u,i);l.push(f)}e.morphAttributes[o]=l}e.morphTargetsRelative=this.morphTargetsRelative;const r=this.groups;for(let o=0,l=r.length;o<l;o++){const c=r[o];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const i=this.attributes;for(const l in i){const c=i[l];t.data.attributes[l]=c.toJSON(t.data)}const s={};let a=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){const f=c[d];h.push(f.toJSON(t.data))}h.length>0&&(s[l]=h,a=!0)}a&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);const r=this.groups;r.length>0&&(t.data.groups=JSON.parse(JSON.stringify(r)));const o=this.boundingSphere;return o!==null&&(t.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const i=t.index;i!==null&&this.setIndex(i.clone(e));const s=t.attributes;for(const c in s){const h=s[c];this.setAttribute(c,h.clone(e))}const a=t.morphAttributes;for(const c in a){const h=[],d=a[c];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;const r=t.groups;for(let c=0,h=r.length;c<h;c++){const d=r[c];this.addGroup(d.start,d.count,d.materialIndex)}const o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Uc=new ue,yi=new Nd,Ra=new kl,Nc=new N,ji=new N,Ji=new N,Qi=new N,to=new N,Pa=new N,La=new Ht,Ia=new Ht,Da=new Ht,Oc=new N,Fc=new N,zc=new N,Ua=new N,Na=new N;class xt extends je{constructor(t=new Pn,e=new Qe){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){const s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=s.length;a<r;a++){const o=s[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}getVertexPosition(t,e){const i=this.geometry,s=i.attributes.position,a=i.morphAttributes.position,r=i.morphTargetsRelative;e.fromBufferAttribute(s,t);const o=this.morphTargetInfluences;if(a&&o){Pa.set(0,0,0);for(let l=0,c=a.length;l<c;l++){const h=o[l],d=a[l];h!==0&&(to.fromBufferAttribute(d,t),r?Pa.addScaledVector(to,h):Pa.addScaledVector(to.sub(e),h))}e.add(Pa)}return e}raycast(t,e){const i=this.geometry,s=this.material,a=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Ra.copy(i.boundingSphere),Ra.applyMatrix4(a),yi.copy(t.ray).recast(t.near),!(Ra.containsPoint(yi.origin)===!1&&(yi.intersectSphere(Ra,Nc)===null||yi.origin.distanceToSquared(Nc)>(t.far-t.near)**2))&&(Uc.copy(a).invert(),yi.copy(t.ray).applyMatrix4(Uc),!(i.boundingBox!==null&&yi.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,e,yi)))}_computeIntersections(t,e,i){let s;const a=this.geometry,r=this.material,o=a.index,l=a.attributes.position,c=a.attributes.uv,h=a.attributes.uv1,d=a.attributes.normal,u=a.groups,f=a.drawRange;if(o!==null)if(Array.isArray(r))for(let g=0,_=u.length;g<_;g++){const m=u[g],p=r[m.materialIndex],S=Math.max(m.start,f.start),y=Math.min(o.count,Math.min(m.start+m.count,f.start+f.count));for(let b=S,C=y;b<C;b+=3){const E=o.getX(b),T=o.getX(b+1),L=o.getX(b+2);s=Oa(this,p,t,i,c,h,d,E,T,L),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{const g=Math.max(0,f.start),_=Math.min(o.count,f.start+f.count);for(let m=g,p=_;m<p;m+=3){const S=o.getX(m),y=o.getX(m+1),b=o.getX(m+2);s=Oa(this,r,t,i,c,h,d,S,y,b),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(r))for(let g=0,_=u.length;g<_;g++){const m=u[g],p=r[m.materialIndex],S=Math.max(m.start,f.start),y=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let b=S,C=y;b<C;b+=3){const E=b,T=b+1,L=b+2;s=Oa(this,p,t,i,c,h,d,E,T,L),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{const g=Math.max(0,f.start),_=Math.min(l.count,f.start+f.count);for(let m=g,p=_;m<p;m+=3){const S=m,y=m+1,b=m+2;s=Oa(this,r,t,i,c,h,d,S,y,b),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}}}function sp(n,t,e,i,s,a,r,o){let l;if(t.side===on?l=i.intersectTriangle(r,a,s,!0,o):l=i.intersectTriangle(s,a,r,t.side===fi,o),l===null)return null;Na.copy(o),Na.applyMatrix4(n.matrixWorld);const c=e.ray.origin.distanceTo(Na);return c<e.near||c>e.far?null:{distance:c,point:Na.clone(),object:n}}function Oa(n,t,e,i,s,a,r,o,l,c){n.getVertexPosition(o,ji),n.getVertexPosition(l,Ji),n.getVertexPosition(c,Qi);const h=sp(n,t,e,i,ji,Ji,Qi,Ua);if(h){s&&(La.fromBufferAttribute(s,o),Ia.fromBufferAttribute(s,l),Da.fromBufferAttribute(s,c),h.uv=Nn.getInterpolation(Ua,ji,Ji,Qi,La,Ia,Da,new Ht)),a&&(La.fromBufferAttribute(a,o),Ia.fromBufferAttribute(a,l),Da.fromBufferAttribute(a,c),h.uv1=Nn.getInterpolation(Ua,ji,Ji,Qi,La,Ia,Da,new Ht)),r&&(Oc.fromBufferAttribute(r,o),Fc.fromBufferAttribute(r,l),zc.fromBufferAttribute(r,c),h.normal=Nn.getInterpolation(Ua,ji,Ji,Qi,Oc,Fc,zc,new N),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));const d={a:o,b:l,c,normal:new N,materialIndex:0};Nn.getNormal(ji,Ji,Qi,d.normal),h.face=d}return h}class ae extends Pn{constructor(t=1,e=1,i=1,s=1,a=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:i,widthSegments:s,heightSegments:a,depthSegments:r};const o=this;s=Math.floor(s),a=Math.floor(a),r=Math.floor(r);const l=[],c=[],h=[],d=[];let u=0,f=0;g("z","y","x",-1,-1,i,e,t,r,a,0),g("z","y","x",1,-1,i,e,-t,r,a,1),g("x","z","y",1,1,t,i,e,s,r,2),g("x","z","y",1,-1,t,i,-e,s,r,3),g("x","y","z",1,-1,t,e,i,s,a,4),g("x","y","z",-1,-1,t,e,-i,s,a,5),this.setIndex(l),this.setAttribute("position",new Be(c,3)),this.setAttribute("normal",new Be(h,3)),this.setAttribute("uv",new Be(d,2));function g(_,m,p,S,y,b,C,E,T,L,w){const x=b/T,R=C/L,O=b/2,F=C/2,H=E/2,V=T+1,G=L+1;let q=0,X=0;const lt=new N;for(let nt=0;nt<G;nt++){const rt=nt*R-F;for(let zt=0;zt<V;zt++){const qt=zt*x-O;lt[_]=qt*S,lt[m]=rt*y,lt[p]=H,c.push(lt.x,lt.y,lt.z),lt[_]=0,lt[m]=0,lt[p]=E>0?1:-1,h.push(lt.x,lt.y,lt.z),d.push(zt/T),d.push(1-nt/L),q+=1}}for(let nt=0;nt<L;nt++)for(let rt=0;rt<T;rt++){const zt=u+rt+V*nt,qt=u+rt+V*(nt+1),W=u+(rt+1)+V*(nt+1),J=u+(rt+1)+V*nt;l.push(zt,qt,J),l.push(qt,W,J),X+=6}o.addGroup(f,X,w),f+=X,u+=q}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ae(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function _s(n){const t={};for(const e in n){t[e]={};for(const i in n[e]){const s=n[e][i];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][i]=null):t[e][i]=s.clone():Array.isArray(s)?t[e][i]=s.slice():t[e][i]=s}}return t}function $e(n){const t={};for(let e=0;e<n.length;e++){const i=_s(n[e]);for(const s in i)t[s]=i[s]}return t}function ap(n){const t=[];for(let e=0;e<n.length;e++)t.push(n[e].clone());return t}function kd(n){const t=n.getRenderTarget();return t===null?n.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:te.workingColorSpace}const rp={clone:_s,merge:$e};var op=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,lp=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class pi extends Ms{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=op,this.fragmentShader=lp,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=_s(t.uniforms),this.uniformsGroups=ap(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const s in this.uniforms){const r=this.uniforms[s].value;r&&r.isTexture?e.uniforms[s]={type:"t",value:r.toJSON(t).uuid}:r&&r.isColor?e.uniforms[s]={type:"c",value:r.getHex()}:r&&r.isVector2?e.uniforms[s]={type:"v2",value:r.toArray()}:r&&r.isVector3?e.uniforms[s]={type:"v3",value:r.toArray()}:r&&r.isVector4?e.uniforms[s]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?e.uniforms[s]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?e.uniforms[s]={type:"m4",value:r.toArray()}:e.uniforms[s]={value:r}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const i={};for(const s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(e.extensions=i),e}}class Bd extends je{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ue,this.projectionMatrix=new ue,this.projectionMatrixInverse=new ue,this.coordinateSystem=jn}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const li=new N,kc=new Ht,Bc=new Ht;class fn extends Bd{constructor(t=50,e=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=qo*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(Or*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return qo*2*Math.atan(Math.tan(Or*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,i){li.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(li.x,li.y).multiplyScalar(-t/li.z),li.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(li.x,li.y).multiplyScalar(-t/li.z)}getViewSize(t,e){return this.getViewBounds(t,kc,Bc),e.subVectors(Bc,kc)}setViewOffset(t,e,i,s,a,r){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=a,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(Or*.5*this.fov)/this.zoom,i=2*e,s=this.aspect*i,a=-.5*s;const r=this.view;if(this.view!==null&&this.view.enabled){const l=r.fullWidth,c=r.fullHeight;a+=r.offsetX*s/l,e-=r.offsetY*i/c,s*=r.width/l,i*=r.height/c}const o=this.filmOffset;o!==0&&(a+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(a,a+s,e,e-i,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const ts=-90,es=1;class cp extends je{constructor(t,e,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new fn(ts,es,t,e);s.layers=this.layers,this.add(s);const a=new fn(ts,es,t,e);a.layers=this.layers,this.add(a);const r=new fn(ts,es,t,e);r.layers=this.layers,this.add(r);const o=new fn(ts,es,t,e);o.layers=this.layers,this.add(o);const l=new fn(ts,es,t,e);l.layers=this.layers,this.add(l);const c=new fn(ts,es,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[i,s,a,r,o,l]=e;for(const c of e)this.remove(c);if(t===jn)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),a.up.set(0,0,-1),a.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===rr)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),a.up.set(0,0,1),a.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[a,r,o,l,c,h]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const _=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,t.setRenderTarget(i,0,s),t.render(e,a),t.setRenderTarget(i,1,s),t.render(e,r),t.setRenderTarget(i,2,s),t.render(e,o),t.setRenderTarget(i,3,s),t.render(e,l),t.setRenderTarget(i,4,s),t.render(e,c),i.texture.generateMipmaps=_,t.setRenderTarget(i,5,s),t.render(e,h),t.setRenderTarget(d,u,f),t.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class Hd extends Ke{constructor(t,e,i,s,a,r,o,l,c,h){t=t!==void 0?t:[],e=e!==void 0?e:fs,super(t,e,i,s,a,r,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class hp extends Oi{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const i={width:t,height:t,depth:1},s=[i,i,i,i,i,i];this.texture=new Hd(s,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:An}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new ae(5,5,5),a=new pi({name:"CubemapFromEquirect",uniforms:_s(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:on,blending:hi});a.uniforms.tEquirect.value=e;const r=new xt(s,a),o=e.minFilter;return e.minFilter===Ii&&(e.minFilter=An),new cp(1,10,this).update(t,r),e.minFilter=o,r.geometry.dispose(),r.material.dispose(),this}clear(t,e,i,s){const a=t.getRenderTarget();for(let r=0;r<6;r++)t.setRenderTarget(this,r),t.clear(e,i,s);t.setRenderTarget(a)}}const eo=new N,dp=new N,up=new Nt;class Ti{constructor(t=new N(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,i,s){return this.normal.set(t,e,i),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,i){const s=eo.subVectors(i,e).cross(dp.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const i=t.delta(eo),s=this.normal.dot(i);if(s===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const a=-(t.start.dot(this.normal)+this.constant)/s;return a<0||a>1?null:e.copy(t.start).addScaledVector(i,a)}intersectsLine(t){const e=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return e<0&&i>0||i<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const i=e||up.getNormalMatrix(t),s=this.coplanarPoint(eo).applyMatrix4(t),a=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(a),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Si=new kl,Fa=new N;class Hl{constructor(t=new Ti,e=new Ti,i=new Ti,s=new Ti,a=new Ti,r=new Ti){this.planes=[t,e,i,s,a,r]}set(t,e,i,s,a,r){const o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(i),o[3].copy(s),o[4].copy(a),o[5].copy(r),this}copy(t){const e=this.planes;for(let i=0;i<6;i++)e[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,e=jn){const i=this.planes,s=t.elements,a=s[0],r=s[1],o=s[2],l=s[3],c=s[4],h=s[5],d=s[6],u=s[7],f=s[8],g=s[9],_=s[10],m=s[11],p=s[12],S=s[13],y=s[14],b=s[15];if(i[0].setComponents(l-a,u-c,m-f,b-p).normalize(),i[1].setComponents(l+a,u+c,m+f,b+p).normalize(),i[2].setComponents(l+r,u+h,m+g,b+S).normalize(),i[3].setComponents(l-r,u-h,m-g,b-S).normalize(),i[4].setComponents(l-o,u-d,m-_,b-y).normalize(),e===jn)i[5].setComponents(l+o,u+d,m+_,b+y).normalize();else if(e===rr)i[5].setComponents(o,d,_,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Si.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Si.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Si)}intersectsSprite(t){return Si.center.set(0,0,0),Si.radius=.7071067811865476,Si.applyMatrix4(t.matrixWorld),this.intersectsSphere(Si)}intersectsSphere(t){const e=this.planes,i=t.center,s=-t.radius;for(let a=0;a<6;a++)if(e[a].distanceToPoint(i)<s)return!1;return!0}intersectsBox(t){const e=this.planes;for(let i=0;i<6;i++){const s=e[i];if(Fa.x=s.normal.x>0?t.max.x:t.min.x,Fa.y=s.normal.y>0?t.max.y:t.min.y,Fa.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(Fa)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let i=0;i<6;i++)if(e[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function Gd(){let n=null,t=!1,e=null,i=null;function s(a,r){e(a,r),i=n.requestAnimationFrame(s)}return{start:function(){t!==!0&&e!==null&&(i=n.requestAnimationFrame(s),t=!0)},stop:function(){n.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(a){e=a},setContext:function(a){n=a}}}function fp(n){const t=new WeakMap;function e(o,l){const c=o.array,h=o.usage,d=c.byteLength,u=n.createBuffer();n.bindBuffer(l,u),n.bufferData(l,c,h),o.onUploadCallback();let f;if(c instanceof Float32Array)f=n.FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?f=n.HALF_FLOAT:f=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=n.SHORT;else if(c instanceof Uint32Array)f=n.UNSIGNED_INT;else if(c instanceof Int32Array)f=n.INT;else if(c instanceof Int8Array)f=n.BYTE;else if(c instanceof Uint8Array)f=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:d}}function i(o,l,c){const h=l.array,d=l._updateRange,u=l.updateRanges;if(n.bindBuffer(c,o),d.count===-1&&u.length===0&&n.bufferSubData(c,0,h),u.length!==0){for(let f=0,g=u.length;f<g;f++){const _=u[f];n.bufferSubData(c,_.start*h.BYTES_PER_ELEMENT,h,_.start,_.count)}l.clearUpdateRanges()}d.count!==-1&&(n.bufferSubData(c,d.offset*h.BYTES_PER_ELEMENT,h,d.offset,d.count),d.count=-1),l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function a(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=t.get(o);l&&(n.deleteBuffer(l.buffer),t.delete(o))}function r(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const c=t.get(o);if(c===void 0)t.set(o,e(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,o,l),c.version=o.version}}return{get:s,remove:a,update:r}}class pn extends Pn{constructor(t=1,e=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:i,heightSegments:s};const a=t/2,r=e/2,o=Math.floor(i),l=Math.floor(s),c=o+1,h=l+1,d=t/o,u=e/l,f=[],g=[],_=[],m=[];for(let p=0;p<h;p++){const S=p*u-r;for(let y=0;y<c;y++){const b=y*d-a;g.push(b,-S,0),_.push(0,0,1),m.push(y/o),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let S=0;S<o;S++){const y=S+c*p,b=S+c*(p+1),C=S+1+c*(p+1),E=S+1+c*p;f.push(y,b,E),f.push(b,C,E)}this.setIndex(f),this.setAttribute("position",new Be(g,3)),this.setAttribute("normal",new Be(_,3)),this.setAttribute("uv",new Be(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new pn(t.width,t.height,t.widthSegments,t.heightSegments)}}var pp=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,mp=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,gp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,_p=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,vp=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,xp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Mp=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,yp=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Sp=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,wp=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,bp=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Ep=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Tp=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Ap=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Cp=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Rp=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Pp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Lp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Ip=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Dp=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Up=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Np=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Op=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Fp=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,zp=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,kp=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Bp=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Hp=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Gp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Xp=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Vp="gl_FragColor = linearToOutputTexel( gl_FragColor );",Wp=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Zp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Yp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,qp=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,$p=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Kp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,jp=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Jp=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Qp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,tm=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,em=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,nm=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,im=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,sm=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,am=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,rm=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,om=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lm=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,cm=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,hm=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,dm=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,um=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,fm=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,pm=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,mm=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,gm=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,_m=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,vm=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,xm=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Mm=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,ym=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Sm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,wm=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,bm=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Em=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Tm=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Am=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Cm=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Rm=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Pm=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Lm=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Im=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Dm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Um=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Nm=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Om=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Fm=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,zm=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,km=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Bm=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Hm=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Gm=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Xm=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Vm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Wm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Zm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Ym=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,qm=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,$m=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,Km=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,jm=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Jm=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Qm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,tg=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,eg=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,ng=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,ig=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,sg=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,ag=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,rg=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,og=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,lg=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,cg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,hg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,dg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,ug=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const fg=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,pg=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,mg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,gg=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,_g=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,vg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,xg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Mg=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,yg=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Sg=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,wg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,bg=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Eg=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Tg=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ag=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Cg=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rg=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Pg=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lg=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Ig=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Dg=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Ug=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Ng=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Og=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Fg=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,zg=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kg=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Bg=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Hg=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Gg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Xg=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Vg=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Wg=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Zg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Dt={alphahash_fragment:pp,alphahash_pars_fragment:mp,alphamap_fragment:gp,alphamap_pars_fragment:_p,alphatest_fragment:vp,alphatest_pars_fragment:xp,aomap_fragment:Mp,aomap_pars_fragment:yp,batching_pars_vertex:Sp,batching_vertex:wp,begin_vertex:bp,beginnormal_vertex:Ep,bsdfs:Tp,iridescence_fragment:Ap,bumpmap_pars_fragment:Cp,clipping_planes_fragment:Rp,clipping_planes_pars_fragment:Pp,clipping_planes_pars_vertex:Lp,clipping_planes_vertex:Ip,color_fragment:Dp,color_pars_fragment:Up,color_pars_vertex:Np,color_vertex:Op,common:Fp,cube_uv_reflection_fragment:zp,defaultnormal_vertex:kp,displacementmap_pars_vertex:Bp,displacementmap_vertex:Hp,emissivemap_fragment:Gp,emissivemap_pars_fragment:Xp,colorspace_fragment:Vp,colorspace_pars_fragment:Wp,envmap_fragment:Zp,envmap_common_pars_fragment:Yp,envmap_pars_fragment:qp,envmap_pars_vertex:$p,envmap_physical_pars_fragment:rm,envmap_vertex:Kp,fog_vertex:jp,fog_pars_vertex:Jp,fog_fragment:Qp,fog_pars_fragment:tm,gradientmap_pars_fragment:em,lightmap_pars_fragment:nm,lights_lambert_fragment:im,lights_lambert_pars_fragment:sm,lights_pars_begin:am,lights_toon_fragment:om,lights_toon_pars_fragment:lm,lights_phong_fragment:cm,lights_phong_pars_fragment:hm,lights_physical_fragment:dm,lights_physical_pars_fragment:um,lights_fragment_begin:fm,lights_fragment_maps:pm,lights_fragment_end:mm,logdepthbuf_fragment:gm,logdepthbuf_pars_fragment:_m,logdepthbuf_pars_vertex:vm,logdepthbuf_vertex:xm,map_fragment:Mm,map_pars_fragment:ym,map_particle_fragment:Sm,map_particle_pars_fragment:wm,metalnessmap_fragment:bm,metalnessmap_pars_fragment:Em,morphinstance_vertex:Tm,morphcolor_vertex:Am,morphnormal_vertex:Cm,morphtarget_pars_vertex:Rm,morphtarget_vertex:Pm,normal_fragment_begin:Lm,normal_fragment_maps:Im,normal_pars_fragment:Dm,normal_pars_vertex:Um,normal_vertex:Nm,normalmap_pars_fragment:Om,clearcoat_normal_fragment_begin:Fm,clearcoat_normal_fragment_maps:zm,clearcoat_pars_fragment:km,iridescence_pars_fragment:Bm,opaque_fragment:Hm,packing:Gm,premultiplied_alpha_fragment:Xm,project_vertex:Vm,dithering_fragment:Wm,dithering_pars_fragment:Zm,roughnessmap_fragment:Ym,roughnessmap_pars_fragment:qm,shadowmap_pars_fragment:$m,shadowmap_pars_vertex:Km,shadowmap_vertex:jm,shadowmask_pars_fragment:Jm,skinbase_vertex:Qm,skinning_pars_vertex:tg,skinning_vertex:eg,skinnormal_vertex:ng,specularmap_fragment:ig,specularmap_pars_fragment:sg,tonemapping_fragment:ag,tonemapping_pars_fragment:rg,transmission_fragment:og,transmission_pars_fragment:lg,uv_pars_fragment:cg,uv_pars_vertex:hg,uv_vertex:dg,worldpos_vertex:ug,background_vert:fg,background_frag:pg,backgroundCube_vert:mg,backgroundCube_frag:gg,cube_vert:_g,cube_frag:vg,depth_vert:xg,depth_frag:Mg,distanceRGBA_vert:yg,distanceRGBA_frag:Sg,equirect_vert:wg,equirect_frag:bg,linedashed_vert:Eg,linedashed_frag:Tg,meshbasic_vert:Ag,meshbasic_frag:Cg,meshlambert_vert:Rg,meshlambert_frag:Pg,meshmatcap_vert:Lg,meshmatcap_frag:Ig,meshnormal_vert:Dg,meshnormal_frag:Ug,meshphong_vert:Ng,meshphong_frag:Og,meshphysical_vert:Fg,meshphysical_frag:zg,meshtoon_vert:kg,meshtoon_frag:Bg,points_vert:Hg,points_frag:Gg,shadow_vert:Xg,shadow_frag:Vg,sprite_vert:Wg,sprite_frag:Zg},st={common:{diffuse:{value:new Lt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Nt},alphaMap:{value:null},alphaMapTransform:{value:new Nt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Nt}},envmap:{envMap:{value:null},envMapRotation:{value:new Nt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Nt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Nt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Nt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Nt},normalScale:{value:new Ht(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Nt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Nt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Nt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Nt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Lt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Lt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Nt},alphaTest:{value:0},uvTransform:{value:new Nt}},sprite:{diffuse:{value:new Lt(16777215)},opacity:{value:1},center:{value:new Ht(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Nt},alphaMap:{value:null},alphaMapTransform:{value:new Nt},alphaTest:{value:0}}},Dn={basic:{uniforms:$e([st.common,st.specularmap,st.envmap,st.aomap,st.lightmap,st.fog]),vertexShader:Dt.meshbasic_vert,fragmentShader:Dt.meshbasic_frag},lambert:{uniforms:$e([st.common,st.specularmap,st.envmap,st.aomap,st.lightmap,st.emissivemap,st.bumpmap,st.normalmap,st.displacementmap,st.fog,st.lights,{emissive:{value:new Lt(0)}}]),vertexShader:Dt.meshlambert_vert,fragmentShader:Dt.meshlambert_frag},phong:{uniforms:$e([st.common,st.specularmap,st.envmap,st.aomap,st.lightmap,st.emissivemap,st.bumpmap,st.normalmap,st.displacementmap,st.fog,st.lights,{emissive:{value:new Lt(0)},specular:{value:new Lt(1118481)},shininess:{value:30}}]),vertexShader:Dt.meshphong_vert,fragmentShader:Dt.meshphong_frag},standard:{uniforms:$e([st.common,st.envmap,st.aomap,st.lightmap,st.emissivemap,st.bumpmap,st.normalmap,st.displacementmap,st.roughnessmap,st.metalnessmap,st.fog,st.lights,{emissive:{value:new Lt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Dt.meshphysical_vert,fragmentShader:Dt.meshphysical_frag},toon:{uniforms:$e([st.common,st.aomap,st.lightmap,st.emissivemap,st.bumpmap,st.normalmap,st.displacementmap,st.gradientmap,st.fog,st.lights,{emissive:{value:new Lt(0)}}]),vertexShader:Dt.meshtoon_vert,fragmentShader:Dt.meshtoon_frag},matcap:{uniforms:$e([st.common,st.bumpmap,st.normalmap,st.displacementmap,st.fog,{matcap:{value:null}}]),vertexShader:Dt.meshmatcap_vert,fragmentShader:Dt.meshmatcap_frag},points:{uniforms:$e([st.points,st.fog]),vertexShader:Dt.points_vert,fragmentShader:Dt.points_frag},dashed:{uniforms:$e([st.common,st.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Dt.linedashed_vert,fragmentShader:Dt.linedashed_frag},depth:{uniforms:$e([st.common,st.displacementmap]),vertexShader:Dt.depth_vert,fragmentShader:Dt.depth_frag},normal:{uniforms:$e([st.common,st.bumpmap,st.normalmap,st.displacementmap,{opacity:{value:1}}]),vertexShader:Dt.meshnormal_vert,fragmentShader:Dt.meshnormal_frag},sprite:{uniforms:$e([st.sprite,st.fog]),vertexShader:Dt.sprite_vert,fragmentShader:Dt.sprite_frag},background:{uniforms:{uvTransform:{value:new Nt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Dt.background_vert,fragmentShader:Dt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Nt}},vertexShader:Dt.backgroundCube_vert,fragmentShader:Dt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Dt.cube_vert,fragmentShader:Dt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Dt.equirect_vert,fragmentShader:Dt.equirect_frag},distanceRGBA:{uniforms:$e([st.common,st.displacementmap,{referencePosition:{value:new N},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Dt.distanceRGBA_vert,fragmentShader:Dt.distanceRGBA_frag},shadow:{uniforms:$e([st.lights,st.fog,{color:{value:new Lt(0)},opacity:{value:1}}]),vertexShader:Dt.shadow_vert,fragmentShader:Dt.shadow_frag}};Dn.physical={uniforms:$e([Dn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Nt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Nt},clearcoatNormalScale:{value:new Ht(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Nt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Nt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Nt},sheen:{value:0},sheenColor:{value:new Lt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Nt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Nt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Nt},transmissionSamplerSize:{value:new Ht},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Nt},attenuationDistance:{value:0},attenuationColor:{value:new Lt(0)},specularColor:{value:new Lt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Nt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Nt},anisotropyVector:{value:new Ht},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Nt}}]),vertexShader:Dt.meshphysical_vert,fragmentShader:Dt.meshphysical_frag};const za={r:0,b:0,g:0},wi=new Rn,Yg=new ue;function qg(n,t,e,i,s,a,r){const o=new Lt(0);let l=a===!0?0:1,c,h,d=null,u=0,f=null;function g(S){let y=S.isScene===!0?S.background:null;return y&&y.isTexture&&(y=(S.backgroundBlurriness>0?e:t).get(y)),y}function _(S){let y=!1;const b=g(S);b===null?p(o,l):b&&b.isColor&&(p(b,1),y=!0);const C=n.xr.getEnvironmentBlendMode();C==="additive"?i.buffers.color.setClear(0,0,0,1,r):C==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,r),(n.autoClear||y)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function m(S,y){const b=g(y);b&&(b.isCubeTexture||b.mapping===Mr)?(h===void 0&&(h=new xt(new ae(1,1,1),new pi({name:"BackgroundCubeMaterial",uniforms:_s(Dn.backgroundCube.uniforms),vertexShader:Dn.backgroundCube.vertexShader,fragmentShader:Dn.backgroundCube.fragmentShader,side:on,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(C,E,T){this.matrixWorld.copyPosition(T.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),wi.copy(y.backgroundRotation),wi.x*=-1,wi.y*=-1,wi.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(wi.y*=-1,wi.z*=-1),h.material.uniforms.envMap.value=b,h.material.uniforms.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=y.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(Yg.makeRotationFromEuler(wi)),h.material.toneMapped=te.getTransfer(b.colorSpace)!==re,(d!==b||u!==b.version||f!==n.toneMapping)&&(h.material.needsUpdate=!0,d=b,u=b.version,f=n.toneMapping),h.layers.enableAll(),S.unshift(h,h.geometry,h.material,0,0,null)):b&&b.isTexture&&(c===void 0&&(c=new xt(new pn(2,2),new pi({name:"BackgroundMaterial",uniforms:_s(Dn.background.uniforms),vertexShader:Dn.background.vertexShader,fragmentShader:Dn.background.fragmentShader,side:fi,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(c)),c.material.uniforms.t2D.value=b,c.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,c.material.toneMapped=te.getTransfer(b.colorSpace)!==re,b.matrixAutoUpdate===!0&&b.updateMatrix(),c.material.uniforms.uvTransform.value.copy(b.matrix),(d!==b||u!==b.version||f!==n.toneMapping)&&(c.material.needsUpdate=!0,d=b,u=b.version,f=n.toneMapping),c.layers.enableAll(),S.unshift(c,c.geometry,c.material,0,0,null))}function p(S,y){S.getRGB(za,kd(n)),i.buffers.color.setClear(za.r,za.g,za.b,y,r)}return{getClearColor:function(){return o},setClearColor:function(S,y=1){o.set(S),l=y,p(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(S){l=S,p(o,l)},render:_,addToRenderList:m}}function $g(n,t){const e=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=u(null);let a=s,r=!1;function o(x,R,O,F,H){let V=!1;const G=d(F,O,R);a!==G&&(a=G,c(a.object)),V=f(x,F,O,H),V&&g(x,F,O,H),H!==null&&t.update(H,n.ELEMENT_ARRAY_BUFFER),(V||r)&&(r=!1,b(x,R,O,F),H!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get(H).buffer))}function l(){return n.createVertexArray()}function c(x){return n.bindVertexArray(x)}function h(x){return n.deleteVertexArray(x)}function d(x,R,O){const F=O.wireframe===!0;let H=i[x.id];H===void 0&&(H={},i[x.id]=H);let V=H[R.id];V===void 0&&(V={},H[R.id]=V);let G=V[F];return G===void 0&&(G=u(l()),V[F]=G),G}function u(x){const R=[],O=[],F=[];for(let H=0;H<e;H++)R[H]=0,O[H]=0,F[H]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:R,enabledAttributes:O,attributeDivisors:F,object:x,attributes:{},index:null}}function f(x,R,O,F){const H=a.attributes,V=R.attributes;let G=0;const q=O.getAttributes();for(const X in q)if(q[X].location>=0){const nt=H[X];let rt=V[X];if(rt===void 0&&(X==="instanceMatrix"&&x.instanceMatrix&&(rt=x.instanceMatrix),X==="instanceColor"&&x.instanceColor&&(rt=x.instanceColor)),nt===void 0||nt.attribute!==rt||rt&&nt.data!==rt.data)return!0;G++}return a.attributesNum!==G||a.index!==F}function g(x,R,O,F){const H={},V=R.attributes;let G=0;const q=O.getAttributes();for(const X in q)if(q[X].location>=0){let nt=V[X];nt===void 0&&(X==="instanceMatrix"&&x.instanceMatrix&&(nt=x.instanceMatrix),X==="instanceColor"&&x.instanceColor&&(nt=x.instanceColor));const rt={};rt.attribute=nt,nt&&nt.data&&(rt.data=nt.data),H[X]=rt,G++}a.attributes=H,a.attributesNum=G,a.index=F}function _(){const x=a.newAttributes;for(let R=0,O=x.length;R<O;R++)x[R]=0}function m(x){p(x,0)}function p(x,R){const O=a.newAttributes,F=a.enabledAttributes,H=a.attributeDivisors;O[x]=1,F[x]===0&&(n.enableVertexAttribArray(x),F[x]=1),H[x]!==R&&(n.vertexAttribDivisor(x,R),H[x]=R)}function S(){const x=a.newAttributes,R=a.enabledAttributes;for(let O=0,F=R.length;O<F;O++)R[O]!==x[O]&&(n.disableVertexAttribArray(O),R[O]=0)}function y(x,R,O,F,H,V,G){G===!0?n.vertexAttribIPointer(x,R,O,H,V):n.vertexAttribPointer(x,R,O,F,H,V)}function b(x,R,O,F){_();const H=F.attributes,V=O.getAttributes(),G=R.defaultAttributeValues;for(const q in V){const X=V[q];if(X.location>=0){let lt=H[q];if(lt===void 0&&(q==="instanceMatrix"&&x.instanceMatrix&&(lt=x.instanceMatrix),q==="instanceColor"&&x.instanceColor&&(lt=x.instanceColor)),lt!==void 0){const nt=lt.normalized,rt=lt.itemSize,zt=t.get(lt);if(zt===void 0)continue;const qt=zt.buffer,W=zt.type,J=zt.bytesPerElement,mt=W===n.INT||W===n.UNSIGNED_INT||lt.gpuType===Ll;if(lt.isInterleavedBufferAttribute){const ht=lt.data,bt=ht.stride,Rt=lt.offset;if(ht.isInstancedInterleavedBuffer){for(let Gt=0;Gt<X.locationSize;Gt++)p(X.location+Gt,ht.meshPerAttribute);x.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=ht.meshPerAttribute*ht.count)}else for(let Gt=0;Gt<X.locationSize;Gt++)m(X.location+Gt);n.bindBuffer(n.ARRAY_BUFFER,qt);for(let Gt=0;Gt<X.locationSize;Gt++)y(X.location+Gt,rt/X.locationSize,W,nt,bt*J,(Rt+rt/X.locationSize*Gt)*J,mt)}else{if(lt.isInstancedBufferAttribute){for(let ht=0;ht<X.locationSize;ht++)p(X.location+ht,lt.meshPerAttribute);x.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=lt.meshPerAttribute*lt.count)}else for(let ht=0;ht<X.locationSize;ht++)m(X.location+ht);n.bindBuffer(n.ARRAY_BUFFER,qt);for(let ht=0;ht<X.locationSize;ht++)y(X.location+ht,rt/X.locationSize,W,nt,rt*J,rt/X.locationSize*ht*J,mt)}}else if(G!==void 0){const nt=G[q];if(nt!==void 0)switch(nt.length){case 2:n.vertexAttrib2fv(X.location,nt);break;case 3:n.vertexAttrib3fv(X.location,nt);break;case 4:n.vertexAttrib4fv(X.location,nt);break;default:n.vertexAttrib1fv(X.location,nt)}}}}S()}function C(){L();for(const x in i){const R=i[x];for(const O in R){const F=R[O];for(const H in F)h(F[H].object),delete F[H];delete R[O]}delete i[x]}}function E(x){if(i[x.id]===void 0)return;const R=i[x.id];for(const O in R){const F=R[O];for(const H in F)h(F[H].object),delete F[H];delete R[O]}delete i[x.id]}function T(x){for(const R in i){const O=i[R];if(O[x.id]===void 0)continue;const F=O[x.id];for(const H in F)h(F[H].object),delete F[H];delete O[x.id]}}function L(){w(),r=!0,a!==s&&(a=s,c(a.object))}function w(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:L,resetDefaultState:w,dispose:C,releaseStatesOfGeometry:E,releaseStatesOfProgram:T,initAttributes:_,enableAttribute:m,disableUnusedAttributes:S}}function Kg(n,t,e){let i;function s(c){i=c}function a(c,h){n.drawArrays(i,c,h),e.update(h,i,1)}function r(c,h,d){d!==0&&(n.drawArraysInstanced(i,c,h,d),e.update(h,i,d))}function o(c,h,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,h,0,d);let f=0;for(let g=0;g<d;g++)f+=h[g];e.update(f,i,1)}function l(c,h,d,u){if(d===0)return;const f=t.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<c.length;g++)r(c[g],h[g],u[g]);else{f.multiDrawArraysInstancedWEBGL(i,c,0,h,0,u,0,d);let g=0;for(let _=0;_<d;_++)g+=h[_];for(let _=0;_<u.length;_++)e.update(g,i,u[_])}}this.setMode=s,this.render=a,this.renderInstances=r,this.renderMultiDraw=o,this.renderMultiDrawInstances=l}function jg(n,t,e,i){let s;function a(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){const E=t.get("EXT_texture_filter_anisotropic");s=n.getParameter(E.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function r(E){return!(E!==Cn&&i.convert(E)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(E){const T=E===la&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(E!==ti&&i.convert(E)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&E!==Kn&&!T)}function l(E){if(E==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";E="mediump"}return E==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp";const h=l(c);h!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const d=e.logarithmicDepthBuffer===!0,u=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),f=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_TEXTURE_SIZE),_=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),m=n.getParameter(n.MAX_VERTEX_ATTRIBS),p=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),S=n.getParameter(n.MAX_VARYING_VECTORS),y=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),b=f>0,C=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:l,textureFormatReadable:r,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:d,maxTextures:u,maxVertexTextures:f,maxTextureSize:g,maxCubemapSize:_,maxAttributes:m,maxVertexUniforms:p,maxVaryings:S,maxFragmentUniforms:y,vertexTextures:b,maxSamples:C}}function Jg(n){const t=this;let e=null,i=0,s=!1,a=!1;const r=new Ti,o=new Nt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const f=d.length!==0||u||i!==0||s;return s=u,i=d.length,f},this.beginShadows=function(){a=!0,h(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(d,u){e=h(d,u,0)},this.setState=function(d,u,f){const g=d.clippingPlanes,_=d.clipIntersection,m=d.clipShadows,p=n.get(d);if(!s||g===null||g.length===0||a&&!m)a?h(null):c();else{const S=a?0:i,y=S*4;let b=p.clippingState||null;l.value=b,b=h(g,u,y,f);for(let C=0;C!==y;++C)b[C]=e[C];p.clippingState=b,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=S}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function h(d,u,f,g){const _=d!==null?d.length:0;let m=null;if(_!==0){if(m=l.value,g!==!0||m===null){const p=f+_*4,S=u.matrixWorldInverse;o.getNormalMatrix(S),(m===null||m.length<p)&&(m=new Float32Array(p));for(let y=0,b=f;y!==_;++y,b+=4)r.copy(d[y]).applyMatrix4(S,o),r.normal.toArray(m,b),m[b+3]=r.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=_,t.numIntersection=0,m}}function Qg(n){let t=new WeakMap;function e(r,o){return o===xo?r.mapping=fs:o===Mo&&(r.mapping=ps),r}function i(r){if(r&&r.isTexture){const o=r.mapping;if(o===xo||o===Mo)if(t.has(r)){const l=t.get(r).texture;return e(l,r.mapping)}else{const l=r.image;if(l&&l.height>0){const c=new hp(l.height);return c.fromEquirectangularTexture(n,r),t.set(r,c),r.addEventListener("dispose",s),e(c.texture,r.mapping)}else return null}}return r}function s(r){const o=r.target;o.removeEventListener("dispose",s);const l=t.get(o);l!==void 0&&(t.delete(o),l.dispose())}function a(){t=new WeakMap}return{get:i,dispose:a}}class t0 extends Bd{constructor(t=-1,e=1,i=1,s=-1,a=.1,r=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=i,this.bottom=s,this.near=a,this.far=r,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,i,s,a,r){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=a,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let a=i-t,r=i+t,o=s+e,l=s-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;a+=c*this.view.offsetX,r=a+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(a,r,o,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}const ss=4,Hc=[.125,.215,.35,.446,.526,.582],Pi=20,no=new t0,Gc=new Lt;let io=null,so=0,ao=0,ro=!1;const Ai=(1+Math.sqrt(5))/2,ns=1/Ai,Xc=[new N(-Ai,ns,0),new N(Ai,ns,0),new N(-ns,0,Ai),new N(ns,0,Ai),new N(0,Ai,-ns),new N(0,Ai,ns),new N(-1,1,-1),new N(1,1,-1),new N(-1,1,1),new N(1,1,1)];class Vc{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,i=.1,s=100){io=this._renderer.getRenderTarget(),so=this._renderer.getActiveCubeFace(),ao=this._renderer.getActiveMipmapLevel(),ro=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const a=this._allocateTargets();return a.depthBuffer=!0,this._sceneToCubeUV(t,i,s,a),e>0&&this._blur(a,0,0,e),this._applyPMREM(a),this._cleanup(a),a}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Yc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Zc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(io,so,ao),this._renderer.xr.enabled=ro,t.scissorTest=!1,ka(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===fs||t.mapping===ps?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),io=this._renderer.getRenderTarget(),so=this._renderer.getActiveCubeFace(),ao=this._renderer.getActiveMipmapLevel(),ro=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=e||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,i={magFilter:An,minFilter:An,generateMipmaps:!1,type:la,format:Cn,colorSpace:_i,depthBuffer:!1},s=Wc(t,e,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Wc(t,e,i);const{_lodMax:a}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=e0(a)),this._blurMaterial=n0(a,t,e)}return s}_compileMaterial(t){const e=new xt(this._lodPlanes[0],t);this._renderer.compile(e,no)}_sceneToCubeUV(t,e,i,s){const o=new fn(90,1,e,i),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,u=h.toneMapping;h.getClearColor(Gc),h.toneMapping=di,h.autoClear=!1;const f=new Qe({name:"PMREM.Background",side:on,depthWrite:!1,depthTest:!1}),g=new xt(new ae,f);let _=!1;const m=t.background;m?m.isColor&&(f.color.copy(m),t.background=null,_=!0):(f.color.copy(Gc),_=!0);for(let p=0;p<6;p++){const S=p%3;S===0?(o.up.set(0,l[p],0),o.lookAt(c[p],0,0)):S===1?(o.up.set(0,0,l[p]),o.lookAt(0,c[p],0)):(o.up.set(0,l[p],0),o.lookAt(0,0,c[p]));const y=this._cubeSize;ka(s,S*y,p>2?y:0,y,y),h.setRenderTarget(s),_&&h.render(g,o),h.render(t,o)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=u,h.autoClear=d,t.background=m}_textureToCubeUV(t,e){const i=this._renderer,s=t.mapping===fs||t.mapping===ps;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Yc()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Zc());const a=s?this._cubemapMaterial:this._equirectMaterial,r=new xt(this._lodPlanes[0],a),o=a.uniforms;o.envMap.value=t;const l=this._cubeSize;ka(e,0,0,3*l,2*l),i.setRenderTarget(e),i.render(r,no)}_applyPMREM(t){const e=this._renderer,i=e.autoClear;e.autoClear=!1;const s=this._lodPlanes.length;for(let a=1;a<s;a++){const r=Math.sqrt(this._sigmas[a]*this._sigmas[a]-this._sigmas[a-1]*this._sigmas[a-1]),o=Xc[(s-a-1)%Xc.length];this._blur(t,a-1,a,r,o)}e.autoClear=i}_blur(t,e,i,s,a){const r=this._pingPongRenderTarget;this._halfBlur(t,r,e,i,s,"latitudinal",a),this._halfBlur(r,t,i,i,s,"longitudinal",a)}_halfBlur(t,e,i,s,a,r,o){const l=this._renderer,c=this._blurMaterial;r!=="latitudinal"&&r!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,d=new xt(this._lodPlanes[s],c),u=c.uniforms,f=this._sizeLods[i]-1,g=isFinite(a)?Math.PI/(2*f):2*Math.PI/(2*Pi-1),_=a/g,m=isFinite(a)?1+Math.floor(h*_):Pi;m>Pi&&console.warn(`sigmaRadians, ${a}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Pi}`);const p=[];let S=0;for(let T=0;T<Pi;++T){const L=T/_,w=Math.exp(-L*L/2);p.push(w),T===0?S+=w:T<m&&(S+=2*w)}for(let T=0;T<p.length;T++)p[T]=p[T]/S;u.envMap.value=t.texture,u.samples.value=m,u.weights.value=p,u.latitudinal.value=r==="latitudinal",o&&(u.poleAxis.value=o);const{_lodMax:y}=this;u.dTheta.value=g,u.mipInt.value=y-i;const b=this._sizeLods[s],C=3*b*(s>y-ss?s-y+ss:0),E=4*(this._cubeSize-b);ka(e,C,E,3*b,2*b),l.setRenderTarget(e),l.render(d,no)}}function e0(n){const t=[],e=[],i=[];let s=n;const a=n-ss+1+Hc.length;for(let r=0;r<a;r++){const o=Math.pow(2,s);e.push(o);let l=1/o;r>n-ss?l=Hc[r-n+ss-1]:r===0&&(l=0),i.push(l);const c=1/(o-2),h=-c,d=1+c,u=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,g=6,_=3,m=2,p=1,S=new Float32Array(_*g*f),y=new Float32Array(m*g*f),b=new Float32Array(p*g*f);for(let E=0;E<f;E++){const T=E%3*2/3-1,L=E>2?0:-1,w=[T,L,0,T+2/3,L,0,T+2/3,L+1,0,T,L,0,T+2/3,L+1,0,T,L+1,0];S.set(w,_*g*E),y.set(u,m*g*E);const x=[E,E,E,E,E,E];b.set(x,p*g*E)}const C=new Pn;C.setAttribute("position",new zn(S,_)),C.setAttribute("uv",new zn(y,m)),C.setAttribute("faceIndex",new zn(b,p)),t.push(C),s>ss&&s--}return{lodPlanes:t,sizeLods:e,sigmas:i}}function Wc(n,t,e){const i=new Oi(n,t,e);return i.texture.mapping=Mr,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function ka(n,t,e,i,s){n.viewport.set(t,e,i,s),n.scissor.set(t,e,i,s)}function n0(n,t,e){const i=new Float32Array(Pi),s=new N(0,1,0);return new pi({name:"SphericalGaussianBlur",defines:{n:Pi,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Gl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:hi,depthTest:!1,depthWrite:!1})}function Zc(){return new pi({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Gl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:hi,depthTest:!1,depthWrite:!1})}function Yc(){return new pi({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Gl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:hi,depthTest:!1,depthWrite:!1})}function Gl(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function i0(n){let t=new WeakMap,e=null;function i(o){if(o&&o.isTexture){const l=o.mapping,c=l===xo||l===Mo,h=l===fs||l===ps;if(c||h){let d=t.get(o);const u=d!==void 0?d.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==u)return e===null&&(e=new Vc(n)),d=c?e.fromEquirectangular(o,d):e.fromCubemap(o,d),d.texture.pmremVersion=o.pmremVersion,t.set(o,d),d.texture;if(d!==void 0)return d.texture;{const f=o.image;return c&&f&&f.height>0||h&&f&&s(f)?(e===null&&(e=new Vc(n)),d=c?e.fromEquirectangular(o):e.fromCubemap(o),d.texture.pmremVersion=o.pmremVersion,t.set(o,d),o.addEventListener("dispose",a),d.texture):null}}}return o}function s(o){let l=0;const c=6;for(let h=0;h<c;h++)o[h]!==void 0&&l++;return l===c}function a(o){const l=o.target;l.removeEventListener("dispose",a);const c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function r(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:i,dispose:r}}function s0(n){const t={};function e(i){if(t[i]!==void 0)return t[i];let s;switch(i){case"WEBGL_depth_texture":s=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=n.getExtension(i)}return t[i]=s,s}return{has:function(i){return e(i)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(i){const s=e(i);return s===null&&qs("THREE.WebGLRenderer: "+i+" extension not supported."),s}}}function a0(n,t,e,i){const s={},a=new WeakMap;function r(d){const u=d.target;u.index!==null&&t.remove(u.index);for(const g in u.attributes)t.remove(u.attributes[g]);for(const g in u.morphAttributes){const _=u.morphAttributes[g];for(let m=0,p=_.length;m<p;m++)t.remove(_[m])}u.removeEventListener("dispose",r),delete s[u.id];const f=a.get(u);f&&(t.remove(f),a.delete(u)),i.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function o(d,u){return s[u.id]===!0||(u.addEventListener("dispose",r),s[u.id]=!0,e.memory.geometries++),u}function l(d){const u=d.attributes;for(const g in u)t.update(u[g],n.ARRAY_BUFFER);const f=d.morphAttributes;for(const g in f){const _=f[g];for(let m=0,p=_.length;m<p;m++)t.update(_[m],n.ARRAY_BUFFER)}}function c(d){const u=[],f=d.index,g=d.attributes.position;let _=0;if(f!==null){const S=f.array;_=f.version;for(let y=0,b=S.length;y<b;y+=3){const C=S[y+0],E=S[y+1],T=S[y+2];u.push(C,E,E,T,T,C)}}else if(g!==void 0){const S=g.array;_=g.version;for(let y=0,b=S.length/3-1;y<b;y+=3){const C=y+0,E=y+1,T=y+2;u.push(C,E,E,T,T,C)}}else return;const m=new(Id(u)?zd:Fd)(u,1);m.version=_;const p=a.get(d);p&&t.remove(p),a.set(d,m)}function h(d){const u=a.get(d);if(u){const f=d.index;f!==null&&u.version<f.version&&c(d)}else c(d);return a.get(d)}return{get:o,update:l,getWireframeAttribute:h}}function r0(n,t,e){let i;function s(u){i=u}let a,r;function o(u){a=u.type,r=u.bytesPerElement}function l(u,f){n.drawElements(i,f,a,u*r),e.update(f,i,1)}function c(u,f,g){g!==0&&(n.drawElementsInstanced(i,f,a,u*r,g),e.update(f,i,g))}function h(u,f,g){if(g===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,f,0,a,u,0,g);let m=0;for(let p=0;p<g;p++)m+=f[p];e.update(m,i,1)}function d(u,f,g,_){if(g===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<u.length;p++)c(u[p]/r,f[p],_[p]);else{m.multiDrawElementsInstancedWEBGL(i,f,0,a,u,0,_,0,g);let p=0;for(let S=0;S<g;S++)p+=f[S];for(let S=0;S<_.length;S++)e.update(p,i,_[S])}}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=d}function o0(n){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function i(a,r,o){switch(e.calls++,r){case n.TRIANGLES:e.triangles+=o*(a/3);break;case n.LINES:e.lines+=o*(a/2);break;case n.LINE_STRIP:e.lines+=o*(a-1);break;case n.LINE_LOOP:e.lines+=o*a;break;case n.POINTS:e.points+=o*a;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",r);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:i}}function l0(n,t,e){const i=new WeakMap,s=new oe;function a(r,o,l){const c=r.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=h!==void 0?h.length:0;let u=i.get(o);if(u===void 0||u.count!==d){let x=function(){L.dispose(),i.delete(o),o.removeEventListener("dispose",x)};var f=x;u!==void 0&&u.texture.dispose();const g=o.morphAttributes.position!==void 0,_=o.morphAttributes.normal!==void 0,m=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],S=o.morphAttributes.normal||[],y=o.morphAttributes.color||[];let b=0;g===!0&&(b=1),_===!0&&(b=2),m===!0&&(b=3);let C=o.attributes.position.count*b,E=1;C>t.maxTextureSize&&(E=Math.ceil(C/t.maxTextureSize),C=t.maxTextureSize);const T=new Float32Array(C*E*4*d),L=new Ud(T,C,E,d);L.type=Kn,L.needsUpdate=!0;const w=b*4;for(let R=0;R<d;R++){const O=p[R],F=S[R],H=y[R],V=C*E*4*R;for(let G=0;G<O.count;G++){const q=G*w;g===!0&&(s.fromBufferAttribute(O,G),T[V+q+0]=s.x,T[V+q+1]=s.y,T[V+q+2]=s.z,T[V+q+3]=0),_===!0&&(s.fromBufferAttribute(F,G),T[V+q+4]=s.x,T[V+q+5]=s.y,T[V+q+6]=s.z,T[V+q+7]=0),m===!0&&(s.fromBufferAttribute(H,G),T[V+q+8]=s.x,T[V+q+9]=s.y,T[V+q+10]=s.z,T[V+q+11]=H.itemSize===4?s.w:1)}}u={count:d,texture:L,size:new Ht(C,E)},i.set(o,u),o.addEventListener("dispose",x)}if(r.isInstancedMesh===!0&&r.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",r.morphTexture,e);else{let g=0;for(let m=0;m<c.length;m++)g+=c[m];const _=o.morphTargetsRelative?1:1-g;l.getUniforms().setValue(n,"morphTargetBaseInfluence",_),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(n,"morphTargetsTextureSize",u.size)}return{update:a}}function c0(n,t,e,i){let s=new WeakMap;function a(l){const c=i.render.frame,h=l.geometry,d=t.get(l,h);if(s.get(d)!==c&&(t.update(d),s.set(d,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),s.get(l)!==c&&(e.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,n.ARRAY_BUFFER),s.set(l,c))),l.isSkinnedMesh){const u=l.skeleton;s.get(u)!==c&&(u.update(),s.set(u,c))}return d}function r(){s=new WeakMap}function o(l){const c=l.target;c.removeEventListener("dispose",o),e.remove(c.instanceMatrix),c.instanceColor!==null&&e.remove(c.instanceColor)}return{update:a,dispose:r}}class Xd extends Ke{constructor(t,e,i,s,a,r,o,l,c,h=ds){if(h!==ds&&h!==gs)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&h===ds&&(i=Ni),i===void 0&&h===gs&&(i=ms),super(null,s,a,r,o,l,h,i,c),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=o!==void 0?o:Mn,this.minFilter=l!==void 0?l:Mn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}const Vd=new Ke,qc=new Xd(1,1),Wd=new Ud,Zd=new qf,Yd=new Hd,$c=[],Kc=[],jc=new Float32Array(16),Jc=new Float32Array(9),Qc=new Float32Array(4);function ys(n,t,e){const i=n[0];if(i<=0||i>0)return n;const s=t*e;let a=$c[s];if(a===void 0&&(a=new Float32Array(s),$c[s]=a),t!==0){i.toArray(a,0);for(let r=1,o=0;r!==t;++r)o+=e,n[r].toArray(a,o)}return a}function Le(n,t){if(n.length!==t.length)return!1;for(let e=0,i=n.length;e<i;e++)if(n[e]!==t[e])return!1;return!0}function Ie(n,t){for(let e=0,i=t.length;e<i;e++)n[e]=t[e]}function Sr(n,t){let e=Kc[t];e===void 0&&(e=new Int32Array(t),Kc[t]=e);for(let i=0;i!==t;++i)e[i]=n.allocateTextureUnit();return e}function h0(n,t){const e=this.cache;e[0]!==t&&(n.uniform1f(this.addr,t),e[0]=t)}function d0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Le(e,t))return;n.uniform2fv(this.addr,t),Ie(e,t)}}function u0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(n.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Le(e,t))return;n.uniform3fv(this.addr,t),Ie(e,t)}}function f0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Le(e,t))return;n.uniform4fv(this.addr,t),Ie(e,t)}}function p0(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(Le(e,t))return;n.uniformMatrix2fv(this.addr,!1,t),Ie(e,t)}else{if(Le(e,i))return;Qc.set(i),n.uniformMatrix2fv(this.addr,!1,Qc),Ie(e,i)}}function m0(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(Le(e,t))return;n.uniformMatrix3fv(this.addr,!1,t),Ie(e,t)}else{if(Le(e,i))return;Jc.set(i),n.uniformMatrix3fv(this.addr,!1,Jc),Ie(e,i)}}function g0(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(Le(e,t))return;n.uniformMatrix4fv(this.addr,!1,t),Ie(e,t)}else{if(Le(e,i))return;jc.set(i),n.uniformMatrix4fv(this.addr,!1,jc),Ie(e,i)}}function _0(n,t){const e=this.cache;e[0]!==t&&(n.uniform1i(this.addr,t),e[0]=t)}function v0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Le(e,t))return;n.uniform2iv(this.addr,t),Ie(e,t)}}function x0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Le(e,t))return;n.uniform3iv(this.addr,t),Ie(e,t)}}function M0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Le(e,t))return;n.uniform4iv(this.addr,t),Ie(e,t)}}function y0(n,t){const e=this.cache;e[0]!==t&&(n.uniform1ui(this.addr,t),e[0]=t)}function S0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Le(e,t))return;n.uniform2uiv(this.addr,t),Ie(e,t)}}function w0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Le(e,t))return;n.uniform3uiv(this.addr,t),Ie(e,t)}}function b0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Le(e,t))return;n.uniform4uiv(this.addr,t),Ie(e,t)}}function E0(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let a;this.type===n.SAMPLER_2D_SHADOW?(qc.compareFunction=Ld,a=qc):a=Vd,e.setTexture2D(t||a,s)}function T0(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture3D(t||Zd,s)}function A0(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTextureCube(t||Yd,s)}function C0(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture2DArray(t||Wd,s)}function R0(n){switch(n){case 5126:return h0;case 35664:return d0;case 35665:return u0;case 35666:return f0;case 35674:return p0;case 35675:return m0;case 35676:return g0;case 5124:case 35670:return _0;case 35667:case 35671:return v0;case 35668:case 35672:return x0;case 35669:case 35673:return M0;case 5125:return y0;case 36294:return S0;case 36295:return w0;case 36296:return b0;case 35678:case 36198:case 36298:case 36306:case 35682:return E0;case 35679:case 36299:case 36307:return T0;case 35680:case 36300:case 36308:case 36293:return A0;case 36289:case 36303:case 36311:case 36292:return C0}}function P0(n,t){n.uniform1fv(this.addr,t)}function L0(n,t){const e=ys(t,this.size,2);n.uniform2fv(this.addr,e)}function I0(n,t){const e=ys(t,this.size,3);n.uniform3fv(this.addr,e)}function D0(n,t){const e=ys(t,this.size,4);n.uniform4fv(this.addr,e)}function U0(n,t){const e=ys(t,this.size,4);n.uniformMatrix2fv(this.addr,!1,e)}function N0(n,t){const e=ys(t,this.size,9);n.uniformMatrix3fv(this.addr,!1,e)}function O0(n,t){const e=ys(t,this.size,16);n.uniformMatrix4fv(this.addr,!1,e)}function F0(n,t){n.uniform1iv(this.addr,t)}function z0(n,t){n.uniform2iv(this.addr,t)}function k0(n,t){n.uniform3iv(this.addr,t)}function B0(n,t){n.uniform4iv(this.addr,t)}function H0(n,t){n.uniform1uiv(this.addr,t)}function G0(n,t){n.uniform2uiv(this.addr,t)}function X0(n,t){n.uniform3uiv(this.addr,t)}function V0(n,t){n.uniform4uiv(this.addr,t)}function W0(n,t,e){const i=this.cache,s=t.length,a=Sr(e,s);Le(i,a)||(n.uniform1iv(this.addr,a),Ie(i,a));for(let r=0;r!==s;++r)e.setTexture2D(t[r]||Vd,a[r])}function Z0(n,t,e){const i=this.cache,s=t.length,a=Sr(e,s);Le(i,a)||(n.uniform1iv(this.addr,a),Ie(i,a));for(let r=0;r!==s;++r)e.setTexture3D(t[r]||Zd,a[r])}function Y0(n,t,e){const i=this.cache,s=t.length,a=Sr(e,s);Le(i,a)||(n.uniform1iv(this.addr,a),Ie(i,a));for(let r=0;r!==s;++r)e.setTextureCube(t[r]||Yd,a[r])}function q0(n,t,e){const i=this.cache,s=t.length,a=Sr(e,s);Le(i,a)||(n.uniform1iv(this.addr,a),Ie(i,a));for(let r=0;r!==s;++r)e.setTexture2DArray(t[r]||Wd,a[r])}function $0(n){switch(n){case 5126:return P0;case 35664:return L0;case 35665:return I0;case 35666:return D0;case 35674:return U0;case 35675:return N0;case 35676:return O0;case 5124:case 35670:return F0;case 35667:case 35671:return z0;case 35668:case 35672:return k0;case 35669:case 35673:return B0;case 5125:return H0;case 36294:return G0;case 36295:return X0;case 36296:return V0;case 35678:case 36198:case 36298:case 36306:case 35682:return W0;case 35679:case 36299:case 36307:return Z0;case 35680:case 36300:case 36308:case 36293:return Y0;case 36289:case 36303:case 36311:case 36292:return q0}}class K0{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.setValue=R0(e.type)}}class j0{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=$0(e.type)}}class J0{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,i){const s=this.seq;for(let a=0,r=s.length;a!==r;++a){const o=s[a];o.setValue(t,e[o.id],i)}}}const oo=/(\w+)(\])?(\[|\.)?/g;function th(n,t){n.seq.push(t),n.map[t.id]=t}function Q0(n,t,e){const i=n.name,s=i.length;for(oo.lastIndex=0;;){const a=oo.exec(i),r=oo.lastIndex;let o=a[1];const l=a[2]==="]",c=a[3];if(l&&(o=o|0),c===void 0||c==="["&&r+2===s){th(e,c===void 0?new K0(o,n,t):new j0(o,n,t));break}else{let d=e.map[o];d===void 0&&(d=new J0(o),th(e,d)),e=d}}}class Ja{constructor(t,e){this.seq=[],this.map={};const i=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let s=0;s<i;++s){const a=t.getActiveUniform(e,s),r=t.getUniformLocation(e,a.name);Q0(a,r,this)}}setValue(t,e,i,s){const a=this.map[e];a!==void 0&&a.setValue(t,i,s)}setOptional(t,e,i){const s=e[i];s!==void 0&&this.setValue(t,i,s)}static upload(t,e,i,s){for(let a=0,r=e.length;a!==r;++a){const o=e[a],l=i[o.id];l.needsUpdate!==!1&&o.setValue(t,l.value,s)}}static seqWithValue(t,e){const i=[];for(let s=0,a=t.length;s!==a;++s){const r=t[s];r.id in e&&i.push(r)}return i}}function eh(n,t,e){const i=n.createShader(t);return n.shaderSource(i,e),n.compileShader(i),i}const t_=37297;let e_=0;function n_(n,t){const e=n.split(`
`),i=[],s=Math.max(t-6,0),a=Math.min(t+6,e.length);for(let r=s;r<a;r++){const o=r+1;i.push(`${o===t?">":" "} ${o}: ${e[r]}`)}return i.join(`
`)}function i_(n){const t=te.getPrimaries(te.workingColorSpace),e=te.getPrimaries(n);let i;switch(t===e?i="":t===ar&&e===sr?i="LinearDisplayP3ToLinearSRGB":t===sr&&e===ar&&(i="LinearSRGBToLinearDisplayP3"),n){case _i:case yr:return[i,"LinearTransferOETF"];case In:case zl:return[i,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",n),[i,"LinearTransferOETF"]}}function nh(n,t,e){const i=n.getShaderParameter(t,n.COMPILE_STATUS),s=n.getShaderInfoLog(t).trim();if(i&&s==="")return"";const a=/ERROR: 0:(\d+)/.exec(s);if(a){const r=parseInt(a[1]);return e.toUpperCase()+`

`+s+`

`+n_(n.getShaderSource(t),r)}else return s}function s_(n,t){const e=i_(t);return`vec4 ${n}( vec4 value ) { return ${e[0]}( ${e[1]}( value ) ); }`}function a_(n,t){let e;switch(t){case Sf:e="Linear";break;case wf:e="Reinhard";break;case bf:e="Cineon";break;case Ef:e="ACESFilmic";break;case Af:e="AgX";break;case Cf:e="Neutral";break;case Tf:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+n+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const Ba=new N;function r_(){te.getLuminanceCoefficients(Ba);const n=Ba.x.toFixed(4),t=Ba.y.toFixed(4),e=Ba.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function o_(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ls).join(`
`)}function l_(n){const t=[];for(const e in n){const i=n[e];i!==!1&&t.push("#define "+e+" "+i)}return t.join(`
`)}function c_(n,t){const e={},i=n.getProgramParameter(t,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){const a=n.getActiveAttrib(t,s),r=a.name;let o=1;a.type===n.FLOAT_MAT2&&(o=2),a.type===n.FLOAT_MAT3&&(o=3),a.type===n.FLOAT_MAT4&&(o=4),e[r]={type:a.type,location:n.getAttribLocation(t,r),locationSize:o}}return e}function Ls(n){return n!==""}function ih(n,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function sh(n,t){return n.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const h_=/^[ \t]*#include +<([\w\d./]+)>/gm;function $o(n){return n.replace(h_,u_)}const d_=new Map;function u_(n,t){let e=Dt[t];if(e===void 0){const i=d_.get(t);if(i!==void 0)e=Dt[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("Can not resolve #include <"+t+">")}return $o(e)}const f_=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ah(n){return n.replace(f_,p_)}function p_(n,t,e,i){let s="";for(let a=parseInt(t);a<parseInt(e);a++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+a+" ]").replace(/UNROLLED_LOOP_INDEX/g,a);return s}function rh(n){let t=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?t+=`
#define HIGH_PRECISION`:n.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function m_(n){let t="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===xd?t="SHADOWMAP_TYPE_PCF":n.shadowMapType===Yu?t="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===qn&&(t="SHADOWMAP_TYPE_VSM"),t}function g_(n){let t="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case fs:case ps:t="ENVMAP_TYPE_CUBE";break;case Mr:t="ENVMAP_TYPE_CUBE_UV";break}return t}function __(n){let t="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case ps:t="ENVMAP_MODE_REFRACTION";break}return t}function v_(n){let t="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case Pl:t="ENVMAP_BLENDING_MULTIPLY";break;case Mf:t="ENVMAP_BLENDING_MIX";break;case yf:t="ENVMAP_BLENDING_ADD";break}return t}function x_(n){const t=n.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:i,maxMip:e}}function M_(n,t,e,i){const s=n.getContext(),a=e.defines;let r=e.vertexShader,o=e.fragmentShader;const l=m_(e),c=g_(e),h=__(e),d=v_(e),u=x_(e),f=o_(e),g=l_(a),_=s.createProgram();let m,p,S=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(Ls).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(Ls).join(`
`),p.length>0&&(p+=`
`)):(m=[rh(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ls).join(`
`),p=[rh(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==di?"#define TONE_MAPPING":"",e.toneMapping!==di?Dt.tonemapping_pars_fragment:"",e.toneMapping!==di?a_("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Dt.colorspace_pars_fragment,s_("linearToOutputTexel",e.outputColorSpace),r_(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Ls).join(`
`)),r=$o(r),r=ih(r,e),r=sh(r,e),o=$o(o),o=ih(o,e),o=sh(o,e),r=ah(r),o=ah(o),e.isRawShaderMaterial!==!0&&(S=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",e.glslVersion===yc?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===yc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const y=S+m+r,b=S+p+o,C=eh(s,s.VERTEX_SHADER,y),E=eh(s,s.FRAGMENT_SHADER,b);s.attachShader(_,C),s.attachShader(_,E),e.index0AttributeName!==void 0?s.bindAttribLocation(_,0,e.index0AttributeName):e.morphTargets===!0&&s.bindAttribLocation(_,0,"position"),s.linkProgram(_);function T(R){if(n.debug.checkShaderErrors){const O=s.getProgramInfoLog(_).trim(),F=s.getShaderInfoLog(C).trim(),H=s.getShaderInfoLog(E).trim();let V=!0,G=!0;if(s.getProgramParameter(_,s.LINK_STATUS)===!1)if(V=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,_,C,E);else{const q=nh(s,C,"vertex"),X=nh(s,E,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(_,s.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+O+`
`+q+`
`+X)}else O!==""?console.warn("THREE.WebGLProgram: Program Info Log:",O):(F===""||H==="")&&(G=!1);G&&(R.diagnostics={runnable:V,programLog:O,vertexShader:{log:F,prefix:m},fragmentShader:{log:H,prefix:p}})}s.deleteShader(C),s.deleteShader(E),L=new Ja(s,_),w=c_(s,_)}let L;this.getUniforms=function(){return L===void 0&&T(this),L};let w;this.getAttributes=function(){return w===void 0&&T(this),w};let x=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return x===!1&&(x=s.getProgramParameter(_,t_)),x},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(_),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=e_++,this.cacheKey=t,this.usedTimes=1,this.program=_,this.vertexShader=C,this.fragmentShader=E,this}let y_=0;class S_{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,i=t.fragmentShader,s=this._getShaderStage(e),a=this._getShaderStage(i),r=this._getShaderCacheForMaterial(t);return r.has(s)===!1&&(r.add(s),s.usedTimes++),r.has(a)===!1&&(r.add(a),a.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const i of e)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let i=e.get(t);return i===void 0&&(i=new Set,e.set(t,i)),i}_getShaderStage(t){const e=this.shaderCache;let i=e.get(t);return i===void 0&&(i=new w_(t),e.set(t,i)),i}}class w_{constructor(t){this.id=y_++,this.code=t,this.usedTimes=0}}function b_(n,t,e,i,s,a,r){const o=new Bl,l=new S_,c=new Set,h=[],d=s.logarithmicDepthBuffer,u=s.vertexTextures;let f=s.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(w){return c.add(w),w===0?"uv":`uv${w}`}function m(w,x,R,O,F){const H=O.fog,V=F.geometry,G=w.isMeshStandardMaterial?O.environment:null,q=(w.isMeshStandardMaterial?e:t).get(w.envMap||G),X=q&&q.mapping===Mr?q.image.height:null,lt=g[w.type];w.precision!==null&&(f=s.getMaxPrecision(w.precision),f!==w.precision&&console.warn("THREE.WebGLProgram.getParameters:",w.precision,"not supported, using",f,"instead."));const nt=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,rt=nt!==void 0?nt.length:0;let zt=0;V.morphAttributes.position!==void 0&&(zt=1),V.morphAttributes.normal!==void 0&&(zt=2),V.morphAttributes.color!==void 0&&(zt=3);let qt,W,J,mt;if(lt){const Kt=Dn[lt];qt=Kt.vertexShader,W=Kt.fragmentShader}else qt=w.vertexShader,W=w.fragmentShader,l.update(w),J=l.getVertexShaderID(w),mt=l.getFragmentShaderID(w);const ht=n.getRenderTarget(),bt=F.isInstancedMesh===!0,Rt=F.isBatchedMesh===!0,Gt=!!w.map,_e=!!w.matcap,P=!!q,be=!!w.aoMap,ee=!!w.lightMap,se=!!w.bumpMap,vt=!!w.normalMap,Ee=!!w.displacementMap,At=!!w.emissiveMap,Pt=!!w.metalnessMap,A=!!w.roughnessMap,v=w.anisotropy>0,B=w.clearcoat>0,$=w.dispersion>0,j=w.iridescence>0,K=w.sheen>0,Mt=w.transmission>0,at=v&&!!w.anisotropyMap,dt=B&&!!w.clearcoatMap,It=B&&!!w.clearcoatNormalMap,Q=B&&!!w.clearcoatRoughnessMap,ct=j&&!!w.iridescenceMap,Vt=j&&!!w.iridescenceThicknessMap,Tt=K&&!!w.sheenColorMap,ut=K&&!!w.sheenRoughnessMap,Ct=!!w.specularMap,kt=!!w.specularColorMap,he=!!w.specularIntensityMap,I=Mt&&!!w.transmissionMap,tt=Mt&&!!w.thicknessMap,Z=!!w.gradientMap,Y=!!w.alphaMap,it=w.alphaTest>0,St=!!w.alphaHash,Zt=!!w.extensions;let Te=di;w.toneMapped&&(ht===null||ht.isXRRenderTarget===!0)&&(Te=n.toneMapping);const Ge={shaderID:lt,shaderType:w.type,shaderName:w.name,vertexShader:qt,fragmentShader:W,defines:w.defines,customVertexShaderID:J,customFragmentShaderID:mt,isRawShaderMaterial:w.isRawShaderMaterial===!0,glslVersion:w.glslVersion,precision:f,batching:Rt,batchingColor:Rt&&F._colorsTexture!==null,instancing:bt,instancingColor:bt&&F.instanceColor!==null,instancingMorph:bt&&F.morphTexture!==null,supportsVertexTextures:u,outputColorSpace:ht===null?n.outputColorSpace:ht.isXRRenderTarget===!0?ht.texture.colorSpace:_i,alphaToCoverage:!!w.alphaToCoverage,map:Gt,matcap:_e,envMap:P,envMapMode:P&&q.mapping,envMapCubeUVHeight:X,aoMap:be,lightMap:ee,bumpMap:se,normalMap:vt,displacementMap:u&&Ee,emissiveMap:At,normalMapObjectSpace:vt&&w.normalMapType===If,normalMapTangentSpace:vt&&w.normalMapType===Fl,metalnessMap:Pt,roughnessMap:A,anisotropy:v,anisotropyMap:at,clearcoat:B,clearcoatMap:dt,clearcoatNormalMap:It,clearcoatRoughnessMap:Q,dispersion:$,iridescence:j,iridescenceMap:ct,iridescenceThicknessMap:Vt,sheen:K,sheenColorMap:Tt,sheenRoughnessMap:ut,specularMap:Ct,specularColorMap:kt,specularIntensityMap:he,transmission:Mt,transmissionMap:I,thicknessMap:tt,gradientMap:Z,opaque:w.transparent===!1&&w.blending===hs&&w.alphaToCoverage===!1,alphaMap:Y,alphaTest:it,alphaHash:St,combine:w.combine,mapUv:Gt&&_(w.map.channel),aoMapUv:be&&_(w.aoMap.channel),lightMapUv:ee&&_(w.lightMap.channel),bumpMapUv:se&&_(w.bumpMap.channel),normalMapUv:vt&&_(w.normalMap.channel),displacementMapUv:Ee&&_(w.displacementMap.channel),emissiveMapUv:At&&_(w.emissiveMap.channel),metalnessMapUv:Pt&&_(w.metalnessMap.channel),roughnessMapUv:A&&_(w.roughnessMap.channel),anisotropyMapUv:at&&_(w.anisotropyMap.channel),clearcoatMapUv:dt&&_(w.clearcoatMap.channel),clearcoatNormalMapUv:It&&_(w.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Q&&_(w.clearcoatRoughnessMap.channel),iridescenceMapUv:ct&&_(w.iridescenceMap.channel),iridescenceThicknessMapUv:Vt&&_(w.iridescenceThicknessMap.channel),sheenColorMapUv:Tt&&_(w.sheenColorMap.channel),sheenRoughnessMapUv:ut&&_(w.sheenRoughnessMap.channel),specularMapUv:Ct&&_(w.specularMap.channel),specularColorMapUv:kt&&_(w.specularColorMap.channel),specularIntensityMapUv:he&&_(w.specularIntensityMap.channel),transmissionMapUv:I&&_(w.transmissionMap.channel),thicknessMapUv:tt&&_(w.thicknessMap.channel),alphaMapUv:Y&&_(w.alphaMap.channel),vertexTangents:!!V.attributes.tangent&&(vt||v),vertexColors:w.vertexColors,vertexAlphas:w.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!V.attributes.uv&&(Gt||Y),fog:!!H,useFog:w.fog===!0,fogExp2:!!H&&H.isFogExp2,flatShading:w.flatShading===!0,sizeAttenuation:w.sizeAttenuation===!0,logarithmicDepthBuffer:d,skinning:F.isSkinnedMesh===!0,morphTargets:V.morphAttributes.position!==void 0,morphNormals:V.morphAttributes.normal!==void 0,morphColors:V.morphAttributes.color!==void 0,morphTargetsCount:rt,morphTextureStride:zt,numDirLights:x.directional.length,numPointLights:x.point.length,numSpotLights:x.spot.length,numSpotLightMaps:x.spotLightMap.length,numRectAreaLights:x.rectArea.length,numHemiLights:x.hemi.length,numDirLightShadows:x.directionalShadowMap.length,numPointLightShadows:x.pointShadowMap.length,numSpotLightShadows:x.spotShadowMap.length,numSpotLightShadowsWithMaps:x.numSpotLightShadowsWithMaps,numLightProbes:x.numLightProbes,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:w.dithering,shadowMapEnabled:n.shadowMap.enabled&&R.length>0,shadowMapType:n.shadowMap.type,toneMapping:Te,decodeVideoTexture:Gt&&w.map.isVideoTexture===!0&&te.getTransfer(w.map.colorSpace)===re,premultipliedAlpha:w.premultipliedAlpha,doubleSided:w.side===Un,flipSided:w.side===on,useDepthPacking:w.depthPacking>=0,depthPacking:w.depthPacking||0,index0AttributeName:w.index0AttributeName,extensionClipCullDistance:Zt&&w.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Zt&&w.extensions.multiDraw===!0||Rt)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:w.customProgramCacheKey()};return Ge.vertexUv1s=c.has(1),Ge.vertexUv2s=c.has(2),Ge.vertexUv3s=c.has(3),c.clear(),Ge}function p(w){const x=[];if(w.shaderID?x.push(w.shaderID):(x.push(w.customVertexShaderID),x.push(w.customFragmentShaderID)),w.defines!==void 0)for(const R in w.defines)x.push(R),x.push(w.defines[R]);return w.isRawShaderMaterial===!1&&(S(x,w),y(x,w),x.push(n.outputColorSpace)),x.push(w.customProgramCacheKey),x.join()}function S(w,x){w.push(x.precision),w.push(x.outputColorSpace),w.push(x.envMapMode),w.push(x.envMapCubeUVHeight),w.push(x.mapUv),w.push(x.alphaMapUv),w.push(x.lightMapUv),w.push(x.aoMapUv),w.push(x.bumpMapUv),w.push(x.normalMapUv),w.push(x.displacementMapUv),w.push(x.emissiveMapUv),w.push(x.metalnessMapUv),w.push(x.roughnessMapUv),w.push(x.anisotropyMapUv),w.push(x.clearcoatMapUv),w.push(x.clearcoatNormalMapUv),w.push(x.clearcoatRoughnessMapUv),w.push(x.iridescenceMapUv),w.push(x.iridescenceThicknessMapUv),w.push(x.sheenColorMapUv),w.push(x.sheenRoughnessMapUv),w.push(x.specularMapUv),w.push(x.specularColorMapUv),w.push(x.specularIntensityMapUv),w.push(x.transmissionMapUv),w.push(x.thicknessMapUv),w.push(x.combine),w.push(x.fogExp2),w.push(x.sizeAttenuation),w.push(x.morphTargetsCount),w.push(x.morphAttributeCount),w.push(x.numDirLights),w.push(x.numPointLights),w.push(x.numSpotLights),w.push(x.numSpotLightMaps),w.push(x.numHemiLights),w.push(x.numRectAreaLights),w.push(x.numDirLightShadows),w.push(x.numPointLightShadows),w.push(x.numSpotLightShadows),w.push(x.numSpotLightShadowsWithMaps),w.push(x.numLightProbes),w.push(x.shadowMapType),w.push(x.toneMapping),w.push(x.numClippingPlanes),w.push(x.numClipIntersection),w.push(x.depthPacking)}function y(w,x){o.disableAll(),x.supportsVertexTextures&&o.enable(0),x.instancing&&o.enable(1),x.instancingColor&&o.enable(2),x.instancingMorph&&o.enable(3),x.matcap&&o.enable(4),x.envMap&&o.enable(5),x.normalMapObjectSpace&&o.enable(6),x.normalMapTangentSpace&&o.enable(7),x.clearcoat&&o.enable(8),x.iridescence&&o.enable(9),x.alphaTest&&o.enable(10),x.vertexColors&&o.enable(11),x.vertexAlphas&&o.enable(12),x.vertexUv1s&&o.enable(13),x.vertexUv2s&&o.enable(14),x.vertexUv3s&&o.enable(15),x.vertexTangents&&o.enable(16),x.anisotropy&&o.enable(17),x.alphaHash&&o.enable(18),x.batching&&o.enable(19),x.dispersion&&o.enable(20),x.batchingColor&&o.enable(21),w.push(o.mask),o.disableAll(),x.fog&&o.enable(0),x.useFog&&o.enable(1),x.flatShading&&o.enable(2),x.logarithmicDepthBuffer&&o.enable(3),x.skinning&&o.enable(4),x.morphTargets&&o.enable(5),x.morphNormals&&o.enable(6),x.morphColors&&o.enable(7),x.premultipliedAlpha&&o.enable(8),x.shadowMapEnabled&&o.enable(9),x.doubleSided&&o.enable(10),x.flipSided&&o.enable(11),x.useDepthPacking&&o.enable(12),x.dithering&&o.enable(13),x.transmission&&o.enable(14),x.sheen&&o.enable(15),x.opaque&&o.enable(16),x.pointsUvs&&o.enable(17),x.decodeVideoTexture&&o.enable(18),x.alphaToCoverage&&o.enable(19),w.push(o.mask)}function b(w){const x=g[w.type];let R;if(x){const O=Dn[x];R=rp.clone(O.uniforms)}else R=w.uniforms;return R}function C(w,x){let R;for(let O=0,F=h.length;O<F;O++){const H=h[O];if(H.cacheKey===x){R=H,++R.usedTimes;break}}return R===void 0&&(R=new M_(n,x,w,a),h.push(R)),R}function E(w){if(--w.usedTimes===0){const x=h.indexOf(w);h[x]=h[h.length-1],h.pop(),w.destroy()}}function T(w){l.remove(w)}function L(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:b,acquireProgram:C,releaseProgram:E,releaseShaderCache:T,programs:h,dispose:L}}function E_(){let n=new WeakMap;function t(r){return n.has(r)}function e(r){let o=n.get(r);return o===void 0&&(o={},n.set(r,o)),o}function i(r){n.delete(r)}function s(r,o,l){n.get(r)[o]=l}function a(){n=new WeakMap}return{has:t,get:e,remove:i,update:s,dispose:a}}function T_(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.material.id!==t.material.id?n.material.id-t.material.id:n.z!==t.z?n.z-t.z:n.id-t.id}function oh(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.z!==t.z?t.z-n.z:n.id-t.id}function lh(){const n=[];let t=0;const e=[],i=[],s=[];function a(){t=0,e.length=0,i.length=0,s.length=0}function r(d,u,f,g,_,m){let p=n[t];return p===void 0?(p={id:d.id,object:d,geometry:u,material:f,groupOrder:g,renderOrder:d.renderOrder,z:_,group:m},n[t]=p):(p.id=d.id,p.object=d,p.geometry=u,p.material=f,p.groupOrder=g,p.renderOrder=d.renderOrder,p.z=_,p.group=m),t++,p}function o(d,u,f,g,_,m){const p=r(d,u,f,g,_,m);f.transmission>0?i.push(p):f.transparent===!0?s.push(p):e.push(p)}function l(d,u,f,g,_,m){const p=r(d,u,f,g,_,m);f.transmission>0?i.unshift(p):f.transparent===!0?s.unshift(p):e.unshift(p)}function c(d,u){e.length>1&&e.sort(d||T_),i.length>1&&i.sort(u||oh),s.length>1&&s.sort(u||oh)}function h(){for(let d=t,u=n.length;d<u;d++){const f=n[d];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:e,transmissive:i,transparent:s,init:a,push:o,unshift:l,finish:h,sort:c}}function A_(){let n=new WeakMap;function t(i,s){const a=n.get(i);let r;return a===void 0?(r=new lh,n.set(i,[r])):s>=a.length?(r=new lh,a.push(r)):r=a[s],r}function e(){n=new WeakMap}return{get:t,dispose:e}}function C_(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new N,color:new Lt};break;case"SpotLight":e={position:new N,direction:new N,color:new Lt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new N,color:new Lt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new N,skyColor:new Lt,groundColor:new Lt};break;case"RectAreaLight":e={color:new Lt,position:new N,halfWidth:new N,halfHeight:new N};break}return n[t.id]=e,e}}}function R_(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ht};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ht};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ht,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[t.id]=e,e}}}let P_=0;function L_(n,t){return(t.castShadow?2:0)-(n.castShadow?2:0)+(t.map?1:0)-(n.map?1:0)}function I_(n){const t=new C_,e=R_(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new N);const s=new N,a=new ue,r=new ue;function o(c){let h=0,d=0,u=0;for(let w=0;w<9;w++)i.probe[w].set(0,0,0);let f=0,g=0,_=0,m=0,p=0,S=0,y=0,b=0,C=0,E=0,T=0;c.sort(L_);for(let w=0,x=c.length;w<x;w++){const R=c[w],O=R.color,F=R.intensity,H=R.distance,V=R.shadow&&R.shadow.map?R.shadow.map.texture:null;if(R.isAmbientLight)h+=O.r*F,d+=O.g*F,u+=O.b*F;else if(R.isLightProbe){for(let G=0;G<9;G++)i.probe[G].addScaledVector(R.sh.coefficients[G],F);T++}else if(R.isDirectionalLight){const G=t.get(R);if(G.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){const q=R.shadow,X=e.get(R);X.shadowIntensity=q.intensity,X.shadowBias=q.bias,X.shadowNormalBias=q.normalBias,X.shadowRadius=q.radius,X.shadowMapSize=q.mapSize,i.directionalShadow[f]=X,i.directionalShadowMap[f]=V,i.directionalShadowMatrix[f]=R.shadow.matrix,S++}i.directional[f]=G,f++}else if(R.isSpotLight){const G=t.get(R);G.position.setFromMatrixPosition(R.matrixWorld),G.color.copy(O).multiplyScalar(F),G.distance=H,G.coneCos=Math.cos(R.angle),G.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),G.decay=R.decay,i.spot[_]=G;const q=R.shadow;if(R.map&&(i.spotLightMap[C]=R.map,C++,q.updateMatrices(R),R.castShadow&&E++),i.spotLightMatrix[_]=q.matrix,R.castShadow){const X=e.get(R);X.shadowIntensity=q.intensity,X.shadowBias=q.bias,X.shadowNormalBias=q.normalBias,X.shadowRadius=q.radius,X.shadowMapSize=q.mapSize,i.spotShadow[_]=X,i.spotShadowMap[_]=V,b++}_++}else if(R.isRectAreaLight){const G=t.get(R);G.color.copy(O).multiplyScalar(F),G.halfWidth.set(R.width*.5,0,0),G.halfHeight.set(0,R.height*.5,0),i.rectArea[m]=G,m++}else if(R.isPointLight){const G=t.get(R);if(G.color.copy(R.color).multiplyScalar(R.intensity),G.distance=R.distance,G.decay=R.decay,R.castShadow){const q=R.shadow,X=e.get(R);X.shadowIntensity=q.intensity,X.shadowBias=q.bias,X.shadowNormalBias=q.normalBias,X.shadowRadius=q.radius,X.shadowMapSize=q.mapSize,X.shadowCameraNear=q.camera.near,X.shadowCameraFar=q.camera.far,i.pointShadow[g]=X,i.pointShadowMap[g]=V,i.pointShadowMatrix[g]=R.shadow.matrix,y++}i.point[g]=G,g++}else if(R.isHemisphereLight){const G=t.get(R);G.skyColor.copy(R.color).multiplyScalar(F),G.groundColor.copy(R.groundColor).multiplyScalar(F),i.hemi[p]=G,p++}}m>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=st.LTC_FLOAT_1,i.rectAreaLTC2=st.LTC_FLOAT_2):(i.rectAreaLTC1=st.LTC_HALF_1,i.rectAreaLTC2=st.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=d,i.ambient[2]=u;const L=i.hash;(L.directionalLength!==f||L.pointLength!==g||L.spotLength!==_||L.rectAreaLength!==m||L.hemiLength!==p||L.numDirectionalShadows!==S||L.numPointShadows!==y||L.numSpotShadows!==b||L.numSpotMaps!==C||L.numLightProbes!==T)&&(i.directional.length=f,i.spot.length=_,i.rectArea.length=m,i.point.length=g,i.hemi.length=p,i.directionalShadow.length=S,i.directionalShadowMap.length=S,i.pointShadow.length=y,i.pointShadowMap.length=y,i.spotShadow.length=b,i.spotShadowMap.length=b,i.directionalShadowMatrix.length=S,i.pointShadowMatrix.length=y,i.spotLightMatrix.length=b+C-E,i.spotLightMap.length=C,i.numSpotLightShadowsWithMaps=E,i.numLightProbes=T,L.directionalLength=f,L.pointLength=g,L.spotLength=_,L.rectAreaLength=m,L.hemiLength=p,L.numDirectionalShadows=S,L.numPointShadows=y,L.numSpotShadows=b,L.numSpotMaps=C,L.numLightProbes=T,i.version=P_++)}function l(c,h){let d=0,u=0,f=0,g=0,_=0;const m=h.matrixWorldInverse;for(let p=0,S=c.length;p<S;p++){const y=c[p];if(y.isDirectionalLight){const b=i.directional[d];b.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),b.direction.sub(s),b.direction.transformDirection(m),d++}else if(y.isSpotLight){const b=i.spot[f];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(m),b.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),b.direction.sub(s),b.direction.transformDirection(m),f++}else if(y.isRectAreaLight){const b=i.rectArea[g];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(m),r.identity(),a.copy(y.matrixWorld),a.premultiply(m),r.extractRotation(a),b.halfWidth.set(y.width*.5,0,0),b.halfHeight.set(0,y.height*.5,0),b.halfWidth.applyMatrix4(r),b.halfHeight.applyMatrix4(r),g++}else if(y.isPointLight){const b=i.point[u];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(m),u++}else if(y.isHemisphereLight){const b=i.hemi[_];b.direction.setFromMatrixPosition(y.matrixWorld),b.direction.transformDirection(m),_++}}}return{setup:o,setupView:l,state:i}}function ch(n){const t=new I_(n),e=[],i=[];function s(h){c.camera=h,e.length=0,i.length=0}function a(h){e.push(h)}function r(h){i.push(h)}function o(){t.setup(e)}function l(h){t.setupView(e,h)}const c={lightsArray:e,shadowsArray:i,camera:null,lights:t,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:o,setupLightsView:l,pushLight:a,pushShadow:r}}function D_(n){let t=new WeakMap;function e(s,a=0){const r=t.get(s);let o;return r===void 0?(o=new ch(n),t.set(s,[o])):a>=r.length?(o=new ch(n),r.push(o)):o=r[a],o}function i(){t=new WeakMap}return{get:e,dispose:i}}class U_ extends Ms{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Pf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class N_ extends Ms{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const O_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,F_=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function z_(n,t,e){let i=new Hl;const s=new Ht,a=new Ht,r=new oe,o=new U_({depthPacking:Lf}),l=new N_,c={},h=e.maxTextureSize,d={[fi]:on,[on]:fi,[Un]:Un},u=new pi({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ht},radius:{value:4}},vertexShader:O_,fragmentShader:F_}),f=u.clone();f.defines.HORIZONTAL_PASS=1;const g=new Pn;g.setAttribute("position",new zn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new xt(g,u),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=xd;let p=this.type;this.render=function(E,T,L){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||E.length===0)return;const w=n.getRenderTarget(),x=n.getActiveCubeFace(),R=n.getActiveMipmapLevel(),O=n.state;O.setBlending(hi),O.buffers.color.setClear(1,1,1,1),O.buffers.depth.setTest(!0),O.setScissorTest(!1);const F=p!==qn&&this.type===qn,H=p===qn&&this.type!==qn;for(let V=0,G=E.length;V<G;V++){const q=E[V],X=q.shadow;if(X===void 0){console.warn("THREE.WebGLShadowMap:",q,"has no shadow.");continue}if(X.autoUpdate===!1&&X.needsUpdate===!1)continue;s.copy(X.mapSize);const lt=X.getFrameExtents();if(s.multiply(lt),a.copy(X.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(a.x=Math.floor(h/lt.x),s.x=a.x*lt.x,X.mapSize.x=a.x),s.y>h&&(a.y=Math.floor(h/lt.y),s.y=a.y*lt.y,X.mapSize.y=a.y)),X.map===null||F===!0||H===!0){const rt=this.type!==qn?{minFilter:Mn,magFilter:Mn}:{};X.map!==null&&X.map.dispose(),X.map=new Oi(s.x,s.y,rt),X.map.texture.name=q.name+".shadowMap",X.camera.updateProjectionMatrix()}n.setRenderTarget(X.map),n.clear();const nt=X.getViewportCount();for(let rt=0;rt<nt;rt++){const zt=X.getViewport(rt);r.set(a.x*zt.x,a.y*zt.y,a.x*zt.z,a.y*zt.w),O.viewport(r),X.updateMatrices(q,rt),i=X.getFrustum(),b(T,L,X.camera,q,this.type)}X.isPointLightShadow!==!0&&this.type===qn&&S(X,L),X.needsUpdate=!1}p=this.type,m.needsUpdate=!1,n.setRenderTarget(w,x,R)};function S(E,T){const L=t.update(_);u.defines.VSM_SAMPLES!==E.blurSamples&&(u.defines.VSM_SAMPLES=E.blurSamples,f.defines.VSM_SAMPLES=E.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),E.mapPass===null&&(E.mapPass=new Oi(s.x,s.y)),u.uniforms.shadow_pass.value=E.map.texture,u.uniforms.resolution.value=E.mapSize,u.uniforms.radius.value=E.radius,n.setRenderTarget(E.mapPass),n.clear(),n.renderBufferDirect(T,null,L,u,_,null),f.uniforms.shadow_pass.value=E.mapPass.texture,f.uniforms.resolution.value=E.mapSize,f.uniforms.radius.value=E.radius,n.setRenderTarget(E.map),n.clear(),n.renderBufferDirect(T,null,L,f,_,null)}function y(E,T,L,w){let x=null;const R=L.isPointLight===!0?E.customDistanceMaterial:E.customDepthMaterial;if(R!==void 0)x=R;else if(x=L.isPointLight===!0?l:o,n.localClippingEnabled&&T.clipShadows===!0&&Array.isArray(T.clippingPlanes)&&T.clippingPlanes.length!==0||T.displacementMap&&T.displacementScale!==0||T.alphaMap&&T.alphaTest>0||T.map&&T.alphaTest>0){const O=x.uuid,F=T.uuid;let H=c[O];H===void 0&&(H={},c[O]=H);let V=H[F];V===void 0&&(V=x.clone(),H[F]=V,T.addEventListener("dispose",C)),x=V}if(x.visible=T.visible,x.wireframe=T.wireframe,w===qn?x.side=T.shadowSide!==null?T.shadowSide:T.side:x.side=T.shadowSide!==null?T.shadowSide:d[T.side],x.alphaMap=T.alphaMap,x.alphaTest=T.alphaTest,x.map=T.map,x.clipShadows=T.clipShadows,x.clippingPlanes=T.clippingPlanes,x.clipIntersection=T.clipIntersection,x.displacementMap=T.displacementMap,x.displacementScale=T.displacementScale,x.displacementBias=T.displacementBias,x.wireframeLinewidth=T.wireframeLinewidth,x.linewidth=T.linewidth,L.isPointLight===!0&&x.isMeshDistanceMaterial===!0){const O=n.properties.get(x);O.light=L}return x}function b(E,T,L,w,x){if(E.visible===!1)return;if(E.layers.test(T.layers)&&(E.isMesh||E.isLine||E.isPoints)&&(E.castShadow||E.receiveShadow&&x===qn)&&(!E.frustumCulled||i.intersectsObject(E))){E.modelViewMatrix.multiplyMatrices(L.matrixWorldInverse,E.matrixWorld);const F=t.update(E),H=E.material;if(Array.isArray(H)){const V=F.groups;for(let G=0,q=V.length;G<q;G++){const X=V[G],lt=H[X.materialIndex];if(lt&&lt.visible){const nt=y(E,lt,w,x);E.onBeforeShadow(n,E,T,L,F,nt,X),n.renderBufferDirect(L,null,F,nt,E,X),E.onAfterShadow(n,E,T,L,F,nt,X)}}}else if(H.visible){const V=y(E,H,w,x);E.onBeforeShadow(n,E,T,L,F,V,null),n.renderBufferDirect(L,null,F,V,E,null),E.onAfterShadow(n,E,T,L,F,V,null)}}const O=E.children;for(let F=0,H=O.length;F<H;F++)b(O[F],T,L,w,x)}function C(E){E.target.removeEventListener("dispose",C);for(const L in c){const w=c[L],x=E.target.uuid;x in w&&(w[x].dispose(),delete w[x])}}}function k_(n){function t(){let I=!1;const tt=new oe;let Z=null;const Y=new oe(0,0,0,0);return{setMask:function(it){Z!==it&&!I&&(n.colorMask(it,it,it,it),Z=it)},setLocked:function(it){I=it},setClear:function(it,St,Zt,Te,Ge){Ge===!0&&(it*=Te,St*=Te,Zt*=Te),tt.set(it,St,Zt,Te),Y.equals(tt)===!1&&(n.clearColor(it,St,Zt,Te),Y.copy(tt))},reset:function(){I=!1,Z=null,Y.set(-1,0,0,0)}}}function e(){let I=!1,tt=null,Z=null,Y=null;return{setTest:function(it){it?mt(n.DEPTH_TEST):ht(n.DEPTH_TEST)},setMask:function(it){tt!==it&&!I&&(n.depthMask(it),tt=it)},setFunc:function(it){if(Z!==it){switch(it){case ff:n.depthFunc(n.NEVER);break;case pf:n.depthFunc(n.ALWAYS);break;case mf:n.depthFunc(n.LESS);break;case nr:n.depthFunc(n.LEQUAL);break;case gf:n.depthFunc(n.EQUAL);break;case _f:n.depthFunc(n.GEQUAL);break;case vf:n.depthFunc(n.GREATER);break;case xf:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}Z=it}},setLocked:function(it){I=it},setClear:function(it){Y!==it&&(n.clearDepth(it),Y=it)},reset:function(){I=!1,tt=null,Z=null,Y=null}}}function i(){let I=!1,tt=null,Z=null,Y=null,it=null,St=null,Zt=null,Te=null,Ge=null;return{setTest:function(Kt){I||(Kt?mt(n.STENCIL_TEST):ht(n.STENCIL_TEST))},setMask:function(Kt){tt!==Kt&&!I&&(n.stencilMask(Kt),tt=Kt)},setFunc:function(Kt,Gn,Ln){(Z!==Kt||Y!==Gn||it!==Ln)&&(n.stencilFunc(Kt,Gn,Ln),Z=Kt,Y=Gn,it=Ln)},setOp:function(Kt,Gn,Ln){(St!==Kt||Zt!==Gn||Te!==Ln)&&(n.stencilOp(Kt,Gn,Ln),St=Kt,Zt=Gn,Te=Ln)},setLocked:function(Kt){I=Kt},setClear:function(Kt){Ge!==Kt&&(n.clearStencil(Kt),Ge=Kt)},reset:function(){I=!1,tt=null,Z=null,Y=null,it=null,St=null,Zt=null,Te=null,Ge=null}}}const s=new t,a=new e,r=new i,o=new WeakMap,l=new WeakMap;let c={},h={},d=new WeakMap,u=[],f=null,g=!1,_=null,m=null,p=null,S=null,y=null,b=null,C=null,E=new Lt(0,0,0),T=0,L=!1,w=null,x=null,R=null,O=null,F=null;const H=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let V=!1,G=0;const q=n.getParameter(n.VERSION);q.indexOf("WebGL")!==-1?(G=parseFloat(/^WebGL (\d)/.exec(q)[1]),V=G>=1):q.indexOf("OpenGL ES")!==-1&&(G=parseFloat(/^OpenGL ES (\d)/.exec(q)[1]),V=G>=2);let X=null,lt={};const nt=n.getParameter(n.SCISSOR_BOX),rt=n.getParameter(n.VIEWPORT),zt=new oe().fromArray(nt),qt=new oe().fromArray(rt);function W(I,tt,Z,Y){const it=new Uint8Array(4),St=n.createTexture();n.bindTexture(I,St),n.texParameteri(I,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(I,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let Zt=0;Zt<Z;Zt++)I===n.TEXTURE_3D||I===n.TEXTURE_2D_ARRAY?n.texImage3D(tt,0,n.RGBA,1,1,Y,0,n.RGBA,n.UNSIGNED_BYTE,it):n.texImage2D(tt+Zt,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,it);return St}const J={};J[n.TEXTURE_2D]=W(n.TEXTURE_2D,n.TEXTURE_2D,1),J[n.TEXTURE_CUBE_MAP]=W(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),J[n.TEXTURE_2D_ARRAY]=W(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),J[n.TEXTURE_3D]=W(n.TEXTURE_3D,n.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),r.setClear(0),mt(n.DEPTH_TEST),a.setFunc(nr),se(!1),vt(mc),mt(n.CULL_FACE),be(hi);function mt(I){c[I]!==!0&&(n.enable(I),c[I]=!0)}function ht(I){c[I]!==!1&&(n.disable(I),c[I]=!1)}function bt(I,tt){return h[I]!==tt?(n.bindFramebuffer(I,tt),h[I]=tt,I===n.DRAW_FRAMEBUFFER&&(h[n.FRAMEBUFFER]=tt),I===n.FRAMEBUFFER&&(h[n.DRAW_FRAMEBUFFER]=tt),!0):!1}function Rt(I,tt){let Z=u,Y=!1;if(I){Z=d.get(tt),Z===void 0&&(Z=[],d.set(tt,Z));const it=I.textures;if(Z.length!==it.length||Z[0]!==n.COLOR_ATTACHMENT0){for(let St=0,Zt=it.length;St<Zt;St++)Z[St]=n.COLOR_ATTACHMENT0+St;Z.length=it.length,Y=!0}}else Z[0]!==n.BACK&&(Z[0]=n.BACK,Y=!0);Y&&n.drawBuffers(Z)}function Gt(I){return f!==I?(n.useProgram(I),f=I,!0):!1}const _e={[Ri]:n.FUNC_ADD,[$u]:n.FUNC_SUBTRACT,[Ku]:n.FUNC_REVERSE_SUBTRACT};_e[ju]=n.MIN,_e[Ju]=n.MAX;const P={[Qu]:n.ZERO,[tf]:n.ONE,[ef]:n.SRC_COLOR,[_o]:n.SRC_ALPHA,[lf]:n.SRC_ALPHA_SATURATE,[rf]:n.DST_COLOR,[sf]:n.DST_ALPHA,[nf]:n.ONE_MINUS_SRC_COLOR,[vo]:n.ONE_MINUS_SRC_ALPHA,[of]:n.ONE_MINUS_DST_COLOR,[af]:n.ONE_MINUS_DST_ALPHA,[cf]:n.CONSTANT_COLOR,[hf]:n.ONE_MINUS_CONSTANT_COLOR,[df]:n.CONSTANT_ALPHA,[uf]:n.ONE_MINUS_CONSTANT_ALPHA};function be(I,tt,Z,Y,it,St,Zt,Te,Ge,Kt){if(I===hi){g===!0&&(ht(n.BLEND),g=!1);return}if(g===!1&&(mt(n.BLEND),g=!0),I!==qu){if(I!==_||Kt!==L){if((m!==Ri||y!==Ri)&&(n.blendEquation(n.FUNC_ADD),m=Ri,y=Ri),Kt)switch(I){case hs:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case gc:n.blendFunc(n.ONE,n.ONE);break;case _c:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case vc:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}else switch(I){case hs:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case gc:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case _c:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case vc:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}p=null,S=null,b=null,C=null,E.set(0,0,0),T=0,_=I,L=Kt}return}it=it||tt,St=St||Z,Zt=Zt||Y,(tt!==m||it!==y)&&(n.blendEquationSeparate(_e[tt],_e[it]),m=tt,y=it),(Z!==p||Y!==S||St!==b||Zt!==C)&&(n.blendFuncSeparate(P[Z],P[Y],P[St],P[Zt]),p=Z,S=Y,b=St,C=Zt),(Te.equals(E)===!1||Ge!==T)&&(n.blendColor(Te.r,Te.g,Te.b,Ge),E.copy(Te),T=Ge),_=I,L=!1}function ee(I,tt){I.side===Un?ht(n.CULL_FACE):mt(n.CULL_FACE);let Z=I.side===on;tt&&(Z=!Z),se(Z),I.blending===hs&&I.transparent===!1?be(hi):be(I.blending,I.blendEquation,I.blendSrc,I.blendDst,I.blendEquationAlpha,I.blendSrcAlpha,I.blendDstAlpha,I.blendColor,I.blendAlpha,I.premultipliedAlpha),a.setFunc(I.depthFunc),a.setTest(I.depthTest),a.setMask(I.depthWrite),s.setMask(I.colorWrite);const Y=I.stencilWrite;r.setTest(Y),Y&&(r.setMask(I.stencilWriteMask),r.setFunc(I.stencilFunc,I.stencilRef,I.stencilFuncMask),r.setOp(I.stencilFail,I.stencilZFail,I.stencilZPass)),At(I.polygonOffset,I.polygonOffsetFactor,I.polygonOffsetUnits),I.alphaToCoverage===!0?mt(n.SAMPLE_ALPHA_TO_COVERAGE):ht(n.SAMPLE_ALPHA_TO_COVERAGE)}function se(I){w!==I&&(I?n.frontFace(n.CW):n.frontFace(n.CCW),w=I)}function vt(I){I!==Wu?(mt(n.CULL_FACE),I!==x&&(I===mc?n.cullFace(n.BACK):I===Zu?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):ht(n.CULL_FACE),x=I}function Ee(I){I!==R&&(V&&n.lineWidth(I),R=I)}function At(I,tt,Z){I?(mt(n.POLYGON_OFFSET_FILL),(O!==tt||F!==Z)&&(n.polygonOffset(tt,Z),O=tt,F=Z)):ht(n.POLYGON_OFFSET_FILL)}function Pt(I){I?mt(n.SCISSOR_TEST):ht(n.SCISSOR_TEST)}function A(I){I===void 0&&(I=n.TEXTURE0+H-1),X!==I&&(n.activeTexture(I),X=I)}function v(I,tt,Z){Z===void 0&&(X===null?Z=n.TEXTURE0+H-1:Z=X);let Y=lt[Z];Y===void 0&&(Y={type:void 0,texture:void 0},lt[Z]=Y),(Y.type!==I||Y.texture!==tt)&&(X!==Z&&(n.activeTexture(Z),X=Z),n.bindTexture(I,tt||J[I]),Y.type=I,Y.texture=tt)}function B(){const I=lt[X];I!==void 0&&I.type!==void 0&&(n.bindTexture(I.type,null),I.type=void 0,I.texture=void 0)}function $(){try{n.compressedTexImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function j(){try{n.compressedTexImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function K(){try{n.texSubImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Mt(){try{n.texSubImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function at(){try{n.compressedTexSubImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function dt(){try{n.compressedTexSubImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function It(){try{n.texStorage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Q(){try{n.texStorage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ct(){try{n.texImage2D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Vt(){try{n.texImage3D.apply(n,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Tt(I){zt.equals(I)===!1&&(n.scissor(I.x,I.y,I.z,I.w),zt.copy(I))}function ut(I){qt.equals(I)===!1&&(n.viewport(I.x,I.y,I.z,I.w),qt.copy(I))}function Ct(I,tt){let Z=l.get(tt);Z===void 0&&(Z=new WeakMap,l.set(tt,Z));let Y=Z.get(I);Y===void 0&&(Y=n.getUniformBlockIndex(tt,I.name),Z.set(I,Y))}function kt(I,tt){const Y=l.get(tt).get(I);o.get(tt)!==Y&&(n.uniformBlockBinding(tt,Y,I.__bindingPointIndex),o.set(tt,Y))}function he(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),c={},X=null,lt={},h={},d=new WeakMap,u=[],f=null,g=!1,_=null,m=null,p=null,S=null,y=null,b=null,C=null,E=new Lt(0,0,0),T=0,L=!1,w=null,x=null,R=null,O=null,F=null,zt.set(0,0,n.canvas.width,n.canvas.height),qt.set(0,0,n.canvas.width,n.canvas.height),s.reset(),a.reset(),r.reset()}return{buffers:{color:s,depth:a,stencil:r},enable:mt,disable:ht,bindFramebuffer:bt,drawBuffers:Rt,useProgram:Gt,setBlending:be,setMaterial:ee,setFlipSided:se,setCullFace:vt,setLineWidth:Ee,setPolygonOffset:At,setScissorTest:Pt,activeTexture:A,bindTexture:v,unbindTexture:B,compressedTexImage2D:$,compressedTexImage3D:j,texImage2D:ct,texImage3D:Vt,updateUBOMapping:Ct,uniformBlockBinding:kt,texStorage2D:It,texStorage3D:Q,texSubImage2D:K,texSubImage3D:Mt,compressedTexSubImage2D:at,compressedTexSubImage3D:dt,scissor:Tt,viewport:ut,reset:he}}function hh(n,t,e,i){const s=B_(i);switch(e){case bd:return n*t;case Td:return n*t;case Ad:return n*t*2;case Cd:return n*t/s.components*s.byteLength;case Ul:return n*t/s.components*s.byteLength;case Rd:return n*t*2/s.components*s.byteLength;case Nl:return n*t*2/s.components*s.byteLength;case Ed:return n*t*3/s.components*s.byteLength;case Cn:return n*t*4/s.components*s.byteLength;case Ol:return n*t*4/s.components*s.byteLength;case Ya:case qa:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case $a:case Ka:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case wo:case Eo:return Math.max(n,16)*Math.max(t,8)/4;case So:case bo:return Math.max(n,8)*Math.max(t,8)/2;case To:case Ao:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case Co:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case Ro:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case Po:return Math.floor((n+4)/5)*Math.floor((t+3)/4)*16;case Lo:return Math.floor((n+4)/5)*Math.floor((t+4)/5)*16;case Io:return Math.floor((n+5)/6)*Math.floor((t+4)/5)*16;case Do:return Math.floor((n+5)/6)*Math.floor((t+5)/6)*16;case Uo:return Math.floor((n+7)/8)*Math.floor((t+4)/5)*16;case No:return Math.floor((n+7)/8)*Math.floor((t+5)/6)*16;case Oo:return Math.floor((n+7)/8)*Math.floor((t+7)/8)*16;case Fo:return Math.floor((n+9)/10)*Math.floor((t+4)/5)*16;case zo:return Math.floor((n+9)/10)*Math.floor((t+5)/6)*16;case ko:return Math.floor((n+9)/10)*Math.floor((t+7)/8)*16;case Bo:return Math.floor((n+9)/10)*Math.floor((t+9)/10)*16;case Ho:return Math.floor((n+11)/12)*Math.floor((t+9)/10)*16;case Go:return Math.floor((n+11)/12)*Math.floor((t+11)/12)*16;case ja:case Xo:case Vo:return Math.ceil(n/4)*Math.ceil(t/4)*16;case Pd:case Wo:return Math.ceil(n/4)*Math.ceil(t/4)*8;case Zo:case Yo:return Math.ceil(n/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function B_(n){switch(n){case ti:case yd:return{byteLength:1,components:1};case sa:case Sd:case la:return{byteLength:2,components:1};case Il:case Dl:return{byteLength:2,components:4};case Ni:case Ll:case Kn:return{byteLength:4,components:1};case wd:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}function H_(n,t,e,i,s,a,r){const o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Ht,h=new WeakMap;let d;const u=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(A,v){return f?new OffscreenCanvas(A,v):or("canvas")}function _(A,v,B){let $=1;const j=Pt(A);if((j.width>B||j.height>B)&&($=B/Math.max(j.width,j.height)),$<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){const K=Math.floor($*j.width),Mt=Math.floor($*j.height);d===void 0&&(d=g(K,Mt));const at=v?g(K,Mt):d;return at.width=K,at.height=Mt,at.getContext("2d").drawImage(A,0,0,K,Mt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+j.width+"x"+j.height+") to ("+K+"x"+Mt+")."),at}else return"data"in A&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+j.width+"x"+j.height+")."),A;return A}function m(A){return A.generateMipmaps&&A.minFilter!==Mn&&A.minFilter!==An}function p(A){n.generateMipmap(A)}function S(A,v,B,$,j=!1){if(A!==null){if(n[A]!==void 0)return n[A];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let K=v;if(v===n.RED&&(B===n.FLOAT&&(K=n.R32F),B===n.HALF_FLOAT&&(K=n.R16F),B===n.UNSIGNED_BYTE&&(K=n.R8)),v===n.RED_INTEGER&&(B===n.UNSIGNED_BYTE&&(K=n.R8UI),B===n.UNSIGNED_SHORT&&(K=n.R16UI),B===n.UNSIGNED_INT&&(K=n.R32UI),B===n.BYTE&&(K=n.R8I),B===n.SHORT&&(K=n.R16I),B===n.INT&&(K=n.R32I)),v===n.RG&&(B===n.FLOAT&&(K=n.RG32F),B===n.HALF_FLOAT&&(K=n.RG16F),B===n.UNSIGNED_BYTE&&(K=n.RG8)),v===n.RG_INTEGER&&(B===n.UNSIGNED_BYTE&&(K=n.RG8UI),B===n.UNSIGNED_SHORT&&(K=n.RG16UI),B===n.UNSIGNED_INT&&(K=n.RG32UI),B===n.BYTE&&(K=n.RG8I),B===n.SHORT&&(K=n.RG16I),B===n.INT&&(K=n.RG32I)),v===n.RGB&&B===n.UNSIGNED_INT_5_9_9_9_REV&&(K=n.RGB9_E5),v===n.RGBA){const Mt=j?ir:te.getTransfer($);B===n.FLOAT&&(K=n.RGBA32F),B===n.HALF_FLOAT&&(K=n.RGBA16F),B===n.UNSIGNED_BYTE&&(K=Mt===re?n.SRGB8_ALPHA8:n.RGBA8),B===n.UNSIGNED_SHORT_4_4_4_4&&(K=n.RGBA4),B===n.UNSIGNED_SHORT_5_5_5_1&&(K=n.RGB5_A1)}return(K===n.R16F||K===n.R32F||K===n.RG16F||K===n.RG32F||K===n.RGBA16F||K===n.RGBA32F)&&t.get("EXT_color_buffer_float"),K}function y(A,v){let B;return A?v===null||v===Ni||v===ms?B=n.DEPTH24_STENCIL8:v===Kn?B=n.DEPTH32F_STENCIL8:v===sa&&(B=n.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===Ni||v===ms?B=n.DEPTH_COMPONENT24:v===Kn?B=n.DEPTH_COMPONENT32F:v===sa&&(B=n.DEPTH_COMPONENT16),B}function b(A,v){return m(A)===!0||A.isFramebufferTexture&&A.minFilter!==Mn&&A.minFilter!==An?Math.log2(Math.max(v.width,v.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?v.mipmaps.length:1}function C(A){const v=A.target;v.removeEventListener("dispose",C),T(v),v.isVideoTexture&&h.delete(v)}function E(A){const v=A.target;v.removeEventListener("dispose",E),w(v)}function T(A){const v=i.get(A);if(v.__webglInit===void 0)return;const B=A.source,$=u.get(B);if($){const j=$[v.__cacheKey];j.usedTimes--,j.usedTimes===0&&L(A),Object.keys($).length===0&&u.delete(B)}i.remove(A)}function L(A){const v=i.get(A);n.deleteTexture(v.__webglTexture);const B=A.source,$=u.get(B);delete $[v.__cacheKey],r.memory.textures--}function w(A){const v=i.get(A);if(A.depthTexture&&A.depthTexture.dispose(),A.isWebGLCubeRenderTarget)for(let $=0;$<6;$++){if(Array.isArray(v.__webglFramebuffer[$]))for(let j=0;j<v.__webglFramebuffer[$].length;j++)n.deleteFramebuffer(v.__webglFramebuffer[$][j]);else n.deleteFramebuffer(v.__webglFramebuffer[$]);v.__webglDepthbuffer&&n.deleteRenderbuffer(v.__webglDepthbuffer[$])}else{if(Array.isArray(v.__webglFramebuffer))for(let $=0;$<v.__webglFramebuffer.length;$++)n.deleteFramebuffer(v.__webglFramebuffer[$]);else n.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&n.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&n.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let $=0;$<v.__webglColorRenderbuffer.length;$++)v.__webglColorRenderbuffer[$]&&n.deleteRenderbuffer(v.__webglColorRenderbuffer[$]);v.__webglDepthRenderbuffer&&n.deleteRenderbuffer(v.__webglDepthRenderbuffer)}const B=A.textures;for(let $=0,j=B.length;$<j;$++){const K=i.get(B[$]);K.__webglTexture&&(n.deleteTexture(K.__webglTexture),r.memory.textures--),i.remove(B[$])}i.remove(A)}let x=0;function R(){x=0}function O(){const A=x;return A>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+s.maxTextures),x+=1,A}function F(A){const v=[];return v.push(A.wrapS),v.push(A.wrapT),v.push(A.wrapR||0),v.push(A.magFilter),v.push(A.minFilter),v.push(A.anisotropy),v.push(A.internalFormat),v.push(A.format),v.push(A.type),v.push(A.generateMipmaps),v.push(A.premultiplyAlpha),v.push(A.flipY),v.push(A.unpackAlignment),v.push(A.colorSpace),v.join()}function H(A,v){const B=i.get(A);if(A.isVideoTexture&&Ee(A),A.isRenderTargetTexture===!1&&A.version>0&&B.__version!==A.version){const $=A.image;if($===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if($.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{qt(B,A,v);return}}e.bindTexture(n.TEXTURE_2D,B.__webglTexture,n.TEXTURE0+v)}function V(A,v){const B=i.get(A);if(A.version>0&&B.__version!==A.version){qt(B,A,v);return}e.bindTexture(n.TEXTURE_2D_ARRAY,B.__webglTexture,n.TEXTURE0+v)}function G(A,v){const B=i.get(A);if(A.version>0&&B.__version!==A.version){qt(B,A,v);return}e.bindTexture(n.TEXTURE_3D,B.__webglTexture,n.TEXTURE0+v)}function q(A,v){const B=i.get(A);if(A.version>0&&B.__version!==A.version){W(B,A,v);return}e.bindTexture(n.TEXTURE_CUBE_MAP,B.__webglTexture,n.TEXTURE0+v)}const X={[Je]:n.REPEAT,[Li]:n.CLAMP_TO_EDGE,[yo]:n.MIRRORED_REPEAT},lt={[Mn]:n.NEAREST,[Rf]:n.NEAREST_MIPMAP_NEAREST,[xa]:n.NEAREST_MIPMAP_LINEAR,[An]:n.LINEAR,[Nr]:n.LINEAR_MIPMAP_NEAREST,[Ii]:n.LINEAR_MIPMAP_LINEAR},nt={[Df]:n.NEVER,[kf]:n.ALWAYS,[Uf]:n.LESS,[Ld]:n.LEQUAL,[Nf]:n.EQUAL,[zf]:n.GEQUAL,[Of]:n.GREATER,[Ff]:n.NOTEQUAL};function rt(A,v){if(v.type===Kn&&t.has("OES_texture_float_linear")===!1&&(v.magFilter===An||v.magFilter===Nr||v.magFilter===xa||v.magFilter===Ii||v.minFilter===An||v.minFilter===Nr||v.minFilter===xa||v.minFilter===Ii)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(A,n.TEXTURE_WRAP_S,X[v.wrapS]),n.texParameteri(A,n.TEXTURE_WRAP_T,X[v.wrapT]),(A===n.TEXTURE_3D||A===n.TEXTURE_2D_ARRAY)&&n.texParameteri(A,n.TEXTURE_WRAP_R,X[v.wrapR]),n.texParameteri(A,n.TEXTURE_MAG_FILTER,lt[v.magFilter]),n.texParameteri(A,n.TEXTURE_MIN_FILTER,lt[v.minFilter]),v.compareFunction&&(n.texParameteri(A,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(A,n.TEXTURE_COMPARE_FUNC,nt[v.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===Mn||v.minFilter!==xa&&v.minFilter!==Ii||v.type===Kn&&t.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||i.get(v).__currentAnisotropy){const B=t.get("EXT_texture_filter_anisotropic");n.texParameterf(A,B.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,s.getMaxAnisotropy())),i.get(v).__currentAnisotropy=v.anisotropy}}}function zt(A,v){let B=!1;A.__webglInit===void 0&&(A.__webglInit=!0,v.addEventListener("dispose",C));const $=v.source;let j=u.get($);j===void 0&&(j={},u.set($,j));const K=F(v);if(K!==A.__cacheKey){j[K]===void 0&&(j[K]={texture:n.createTexture(),usedTimes:0},r.memory.textures++,B=!0),j[K].usedTimes++;const Mt=j[A.__cacheKey];Mt!==void 0&&(j[A.__cacheKey].usedTimes--,Mt.usedTimes===0&&L(v)),A.__cacheKey=K,A.__webglTexture=j[K].texture}return B}function qt(A,v,B){let $=n.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&($=n.TEXTURE_2D_ARRAY),v.isData3DTexture&&($=n.TEXTURE_3D);const j=zt(A,v),K=v.source;e.bindTexture($,A.__webglTexture,n.TEXTURE0+B);const Mt=i.get(K);if(K.version!==Mt.__version||j===!0){e.activeTexture(n.TEXTURE0+B);const at=te.getPrimaries(te.workingColorSpace),dt=v.colorSpace===ci?null:te.getPrimaries(v.colorSpace),It=v.colorSpace===ci||at===dt?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,It);let Q=_(v.image,!1,s.maxTextureSize);Q=At(v,Q);const ct=a.convert(v.format,v.colorSpace),Vt=a.convert(v.type);let Tt=S(v.internalFormat,ct,Vt,v.colorSpace,v.isVideoTexture);rt($,v);let ut;const Ct=v.mipmaps,kt=v.isVideoTexture!==!0,he=Mt.__version===void 0||j===!0,I=K.dataReady,tt=b(v,Q);if(v.isDepthTexture)Tt=y(v.format===gs,v.type),he&&(kt?e.texStorage2D(n.TEXTURE_2D,1,Tt,Q.width,Q.height):e.texImage2D(n.TEXTURE_2D,0,Tt,Q.width,Q.height,0,ct,Vt,null));else if(v.isDataTexture)if(Ct.length>0){kt&&he&&e.texStorage2D(n.TEXTURE_2D,tt,Tt,Ct[0].width,Ct[0].height);for(let Z=0,Y=Ct.length;Z<Y;Z++)ut=Ct[Z],kt?I&&e.texSubImage2D(n.TEXTURE_2D,Z,0,0,ut.width,ut.height,ct,Vt,ut.data):e.texImage2D(n.TEXTURE_2D,Z,Tt,ut.width,ut.height,0,ct,Vt,ut.data);v.generateMipmaps=!1}else kt?(he&&e.texStorage2D(n.TEXTURE_2D,tt,Tt,Q.width,Q.height),I&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,Q.width,Q.height,ct,Vt,Q.data)):e.texImage2D(n.TEXTURE_2D,0,Tt,Q.width,Q.height,0,ct,Vt,Q.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){kt&&he&&e.texStorage3D(n.TEXTURE_2D_ARRAY,tt,Tt,Ct[0].width,Ct[0].height,Q.depth);for(let Z=0,Y=Ct.length;Z<Y;Z++)if(ut=Ct[Z],v.format!==Cn)if(ct!==null)if(kt){if(I)if(v.layerUpdates.size>0){const it=hh(ut.width,ut.height,v.format,v.type);for(const St of v.layerUpdates){const Zt=ut.data.subarray(St*it/ut.data.BYTES_PER_ELEMENT,(St+1)*it/ut.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,Z,0,0,St,ut.width,ut.height,1,ct,Zt,0,0)}v.clearLayerUpdates()}else e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,Z,0,0,0,ut.width,ut.height,Q.depth,ct,ut.data,0,0)}else e.compressedTexImage3D(n.TEXTURE_2D_ARRAY,Z,Tt,ut.width,ut.height,Q.depth,0,ut.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else kt?I&&e.texSubImage3D(n.TEXTURE_2D_ARRAY,Z,0,0,0,ut.width,ut.height,Q.depth,ct,Vt,ut.data):e.texImage3D(n.TEXTURE_2D_ARRAY,Z,Tt,ut.width,ut.height,Q.depth,0,ct,Vt,ut.data)}else{kt&&he&&e.texStorage2D(n.TEXTURE_2D,tt,Tt,Ct[0].width,Ct[0].height);for(let Z=0,Y=Ct.length;Z<Y;Z++)ut=Ct[Z],v.format!==Cn?ct!==null?kt?I&&e.compressedTexSubImage2D(n.TEXTURE_2D,Z,0,0,ut.width,ut.height,ct,ut.data):e.compressedTexImage2D(n.TEXTURE_2D,Z,Tt,ut.width,ut.height,0,ut.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):kt?I&&e.texSubImage2D(n.TEXTURE_2D,Z,0,0,ut.width,ut.height,ct,Vt,ut.data):e.texImage2D(n.TEXTURE_2D,Z,Tt,ut.width,ut.height,0,ct,Vt,ut.data)}else if(v.isDataArrayTexture)if(kt){if(he&&e.texStorage3D(n.TEXTURE_2D_ARRAY,tt,Tt,Q.width,Q.height,Q.depth),I)if(v.layerUpdates.size>0){const Z=hh(Q.width,Q.height,v.format,v.type);for(const Y of v.layerUpdates){const it=Q.data.subarray(Y*Z/Q.data.BYTES_PER_ELEMENT,(Y+1)*Z/Q.data.BYTES_PER_ELEMENT);e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,Y,Q.width,Q.height,1,ct,Vt,it)}v.clearLayerUpdates()}else e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,Q.width,Q.height,Q.depth,ct,Vt,Q.data)}else e.texImage3D(n.TEXTURE_2D_ARRAY,0,Tt,Q.width,Q.height,Q.depth,0,ct,Vt,Q.data);else if(v.isData3DTexture)kt?(he&&e.texStorage3D(n.TEXTURE_3D,tt,Tt,Q.width,Q.height,Q.depth),I&&e.texSubImage3D(n.TEXTURE_3D,0,0,0,0,Q.width,Q.height,Q.depth,ct,Vt,Q.data)):e.texImage3D(n.TEXTURE_3D,0,Tt,Q.width,Q.height,Q.depth,0,ct,Vt,Q.data);else if(v.isFramebufferTexture){if(he)if(kt)e.texStorage2D(n.TEXTURE_2D,tt,Tt,Q.width,Q.height);else{let Z=Q.width,Y=Q.height;for(let it=0;it<tt;it++)e.texImage2D(n.TEXTURE_2D,it,Tt,Z,Y,0,ct,Vt,null),Z>>=1,Y>>=1}}else if(Ct.length>0){if(kt&&he){const Z=Pt(Ct[0]);e.texStorage2D(n.TEXTURE_2D,tt,Tt,Z.width,Z.height)}for(let Z=0,Y=Ct.length;Z<Y;Z++)ut=Ct[Z],kt?I&&e.texSubImage2D(n.TEXTURE_2D,Z,0,0,ct,Vt,ut):e.texImage2D(n.TEXTURE_2D,Z,Tt,ct,Vt,ut);v.generateMipmaps=!1}else if(kt){if(he){const Z=Pt(Q);e.texStorage2D(n.TEXTURE_2D,tt,Tt,Z.width,Z.height)}I&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,ct,Vt,Q)}else e.texImage2D(n.TEXTURE_2D,0,Tt,ct,Vt,Q);m(v)&&p($),Mt.__version=K.version,v.onUpdate&&v.onUpdate(v)}A.__version=v.version}function W(A,v,B){if(v.image.length!==6)return;const $=zt(A,v),j=v.source;e.bindTexture(n.TEXTURE_CUBE_MAP,A.__webglTexture,n.TEXTURE0+B);const K=i.get(j);if(j.version!==K.__version||$===!0){e.activeTexture(n.TEXTURE0+B);const Mt=te.getPrimaries(te.workingColorSpace),at=v.colorSpace===ci?null:te.getPrimaries(v.colorSpace),dt=v.colorSpace===ci||Mt===at?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,dt);const It=v.isCompressedTexture||v.image[0].isCompressedTexture,Q=v.image[0]&&v.image[0].isDataTexture,ct=[];for(let Y=0;Y<6;Y++)!It&&!Q?ct[Y]=_(v.image[Y],!0,s.maxCubemapSize):ct[Y]=Q?v.image[Y].image:v.image[Y],ct[Y]=At(v,ct[Y]);const Vt=ct[0],Tt=a.convert(v.format,v.colorSpace),ut=a.convert(v.type),Ct=S(v.internalFormat,Tt,ut,v.colorSpace),kt=v.isVideoTexture!==!0,he=K.__version===void 0||$===!0,I=j.dataReady;let tt=b(v,Vt);rt(n.TEXTURE_CUBE_MAP,v);let Z;if(It){kt&&he&&e.texStorage2D(n.TEXTURE_CUBE_MAP,tt,Ct,Vt.width,Vt.height);for(let Y=0;Y<6;Y++){Z=ct[Y].mipmaps;for(let it=0;it<Z.length;it++){const St=Z[it];v.format!==Cn?Tt!==null?kt?I&&e.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,it,0,0,St.width,St.height,Tt,St.data):e.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,it,Ct,St.width,St.height,0,St.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):kt?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,it,0,0,St.width,St.height,Tt,ut,St.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,it,Ct,St.width,St.height,0,Tt,ut,St.data)}}}else{if(Z=v.mipmaps,kt&&he){Z.length>0&&tt++;const Y=Pt(ct[0]);e.texStorage2D(n.TEXTURE_CUBE_MAP,tt,Ct,Y.width,Y.height)}for(let Y=0;Y<6;Y++)if(Q){kt?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,0,0,ct[Y].width,ct[Y].height,Tt,ut,ct[Y].data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,Ct,ct[Y].width,ct[Y].height,0,Tt,ut,ct[Y].data);for(let it=0;it<Z.length;it++){const Zt=Z[it].image[Y].image;kt?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,it+1,0,0,Zt.width,Zt.height,Tt,ut,Zt.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,it+1,Ct,Zt.width,Zt.height,0,Tt,ut,Zt.data)}}else{kt?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,0,0,Tt,ut,ct[Y]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,Ct,Tt,ut,ct[Y]);for(let it=0;it<Z.length;it++){const St=Z[it];kt?I&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,it+1,0,0,Tt,ut,St.image[Y]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,it+1,Ct,Tt,ut,St.image[Y])}}}m(v)&&p(n.TEXTURE_CUBE_MAP),K.__version=j.version,v.onUpdate&&v.onUpdate(v)}A.__version=v.version}function J(A,v,B,$,j,K){const Mt=a.convert(B.format,B.colorSpace),at=a.convert(B.type),dt=S(B.internalFormat,Mt,at,B.colorSpace);if(!i.get(v).__hasExternalTextures){const Q=Math.max(1,v.width>>K),ct=Math.max(1,v.height>>K);j===n.TEXTURE_3D||j===n.TEXTURE_2D_ARRAY?e.texImage3D(j,K,dt,Q,ct,v.depth,0,Mt,at,null):e.texImage2D(j,K,dt,Q,ct,0,Mt,at,null)}e.bindFramebuffer(n.FRAMEBUFFER,A),vt(v)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,$,j,i.get(B).__webglTexture,0,se(v)):(j===n.TEXTURE_2D||j>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&j<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,$,j,i.get(B).__webglTexture,K),e.bindFramebuffer(n.FRAMEBUFFER,null)}function mt(A,v,B){if(n.bindRenderbuffer(n.RENDERBUFFER,A),v.depthBuffer){const $=v.depthTexture,j=$&&$.isDepthTexture?$.type:null,K=y(v.stencilBuffer,j),Mt=v.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,at=se(v);vt(v)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,at,K,v.width,v.height):B?n.renderbufferStorageMultisample(n.RENDERBUFFER,at,K,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,K,v.width,v.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,Mt,n.RENDERBUFFER,A)}else{const $=v.textures;for(let j=0;j<$.length;j++){const K=$[j],Mt=a.convert(K.format,K.colorSpace),at=a.convert(K.type),dt=S(K.internalFormat,Mt,at,K.colorSpace),It=se(v);B&&vt(v)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,It,dt,v.width,v.height):vt(v)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,It,dt,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,dt,v.width,v.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function ht(A,v){if(v&&v.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(n.FRAMEBUFFER,A),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!i.get(v.depthTexture).__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),H(v.depthTexture,0);const $=i.get(v.depthTexture).__webglTexture,j=se(v);if(v.depthTexture.format===ds)vt(v)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,$,0,j):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,$,0);else if(v.depthTexture.format===gs)vt(v)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,$,0,j):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,$,0);else throw new Error("Unknown depthTexture format")}function bt(A){const v=i.get(A),B=A.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==A.depthTexture){const $=A.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),$){const j=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,$.removeEventListener("dispose",j)};$.addEventListener("dispose",j),v.__depthDisposeCallback=j}v.__boundDepthTexture=$}if(A.depthTexture&&!v.__autoAllocateDepthBuffer){if(B)throw new Error("target.depthTexture not supported in Cube render targets");ht(v.__webglFramebuffer,A)}else if(B){v.__webglDepthbuffer=[];for(let $=0;$<6;$++)if(e.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer[$]),v.__webglDepthbuffer[$]===void 0)v.__webglDepthbuffer[$]=n.createRenderbuffer(),mt(v.__webglDepthbuffer[$],A,!1);else{const j=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,K=v.__webglDepthbuffer[$];n.bindRenderbuffer(n.RENDERBUFFER,K),n.framebufferRenderbuffer(n.FRAMEBUFFER,j,n.RENDERBUFFER,K)}}else if(e.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=n.createRenderbuffer(),mt(v.__webglDepthbuffer,A,!1);else{const $=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,j=v.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,j),n.framebufferRenderbuffer(n.FRAMEBUFFER,$,n.RENDERBUFFER,j)}e.bindFramebuffer(n.FRAMEBUFFER,null)}function Rt(A,v,B){const $=i.get(A);v!==void 0&&J($.__webglFramebuffer,A,A.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),B!==void 0&&bt(A)}function Gt(A){const v=A.texture,B=i.get(A),$=i.get(v);A.addEventListener("dispose",E);const j=A.textures,K=A.isWebGLCubeRenderTarget===!0,Mt=j.length>1;if(Mt||($.__webglTexture===void 0&&($.__webglTexture=n.createTexture()),$.__version=v.version,r.memory.textures++),K){B.__webglFramebuffer=[];for(let at=0;at<6;at++)if(v.mipmaps&&v.mipmaps.length>0){B.__webglFramebuffer[at]=[];for(let dt=0;dt<v.mipmaps.length;dt++)B.__webglFramebuffer[at][dt]=n.createFramebuffer()}else B.__webglFramebuffer[at]=n.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){B.__webglFramebuffer=[];for(let at=0;at<v.mipmaps.length;at++)B.__webglFramebuffer[at]=n.createFramebuffer()}else B.__webglFramebuffer=n.createFramebuffer();if(Mt)for(let at=0,dt=j.length;at<dt;at++){const It=i.get(j[at]);It.__webglTexture===void 0&&(It.__webglTexture=n.createTexture(),r.memory.textures++)}if(A.samples>0&&vt(A)===!1){B.__webglMultisampledFramebuffer=n.createFramebuffer(),B.__webglColorRenderbuffer=[],e.bindFramebuffer(n.FRAMEBUFFER,B.__webglMultisampledFramebuffer);for(let at=0;at<j.length;at++){const dt=j[at];B.__webglColorRenderbuffer[at]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,B.__webglColorRenderbuffer[at]);const It=a.convert(dt.format,dt.colorSpace),Q=a.convert(dt.type),ct=S(dt.internalFormat,It,Q,dt.colorSpace,A.isXRRenderTarget===!0),Vt=se(A);n.renderbufferStorageMultisample(n.RENDERBUFFER,Vt,ct,A.width,A.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+at,n.RENDERBUFFER,B.__webglColorRenderbuffer[at])}n.bindRenderbuffer(n.RENDERBUFFER,null),A.depthBuffer&&(B.__webglDepthRenderbuffer=n.createRenderbuffer(),mt(B.__webglDepthRenderbuffer,A,!0)),e.bindFramebuffer(n.FRAMEBUFFER,null)}}if(K){e.bindTexture(n.TEXTURE_CUBE_MAP,$.__webglTexture),rt(n.TEXTURE_CUBE_MAP,v);for(let at=0;at<6;at++)if(v.mipmaps&&v.mipmaps.length>0)for(let dt=0;dt<v.mipmaps.length;dt++)J(B.__webglFramebuffer[at][dt],A,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+at,dt);else J(B.__webglFramebuffer[at],A,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+at,0);m(v)&&p(n.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(Mt){for(let at=0,dt=j.length;at<dt;at++){const It=j[at],Q=i.get(It);e.bindTexture(n.TEXTURE_2D,Q.__webglTexture),rt(n.TEXTURE_2D,It),J(B.__webglFramebuffer,A,It,n.COLOR_ATTACHMENT0+at,n.TEXTURE_2D,0),m(It)&&p(n.TEXTURE_2D)}e.unbindTexture()}else{let at=n.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(at=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(at,$.__webglTexture),rt(at,v),v.mipmaps&&v.mipmaps.length>0)for(let dt=0;dt<v.mipmaps.length;dt++)J(B.__webglFramebuffer[dt],A,v,n.COLOR_ATTACHMENT0,at,dt);else J(B.__webglFramebuffer,A,v,n.COLOR_ATTACHMENT0,at,0);m(v)&&p(at),e.unbindTexture()}A.depthBuffer&&bt(A)}function _e(A){const v=A.textures;for(let B=0,$=v.length;B<$;B++){const j=v[B];if(m(j)){const K=A.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:n.TEXTURE_2D,Mt=i.get(j).__webglTexture;e.bindTexture(K,Mt),p(K),e.unbindTexture()}}}const P=[],be=[];function ee(A){if(A.samples>0){if(vt(A)===!1){const v=A.textures,B=A.width,$=A.height;let j=n.COLOR_BUFFER_BIT;const K=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Mt=i.get(A),at=v.length>1;if(at)for(let dt=0;dt<v.length;dt++)e.bindFramebuffer(n.FRAMEBUFFER,Mt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+dt,n.RENDERBUFFER,null),e.bindFramebuffer(n.FRAMEBUFFER,Mt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+dt,n.TEXTURE_2D,null,0);e.bindFramebuffer(n.READ_FRAMEBUFFER,Mt.__webglMultisampledFramebuffer),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,Mt.__webglFramebuffer);for(let dt=0;dt<v.length;dt++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(j|=n.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(j|=n.STENCIL_BUFFER_BIT)),at){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,Mt.__webglColorRenderbuffer[dt]);const It=i.get(v[dt]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,It,0)}n.blitFramebuffer(0,0,B,$,0,0,B,$,j,n.NEAREST),l===!0&&(P.length=0,be.length=0,P.push(n.COLOR_ATTACHMENT0+dt),A.depthBuffer&&A.resolveDepthBuffer===!1&&(P.push(K),be.push(K),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,be)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,P))}if(e.bindFramebuffer(n.READ_FRAMEBUFFER,null),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),at)for(let dt=0;dt<v.length;dt++){e.bindFramebuffer(n.FRAMEBUFFER,Mt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+dt,n.RENDERBUFFER,Mt.__webglColorRenderbuffer[dt]);const It=i.get(v[dt]).__webglTexture;e.bindFramebuffer(n.FRAMEBUFFER,Mt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+dt,n.TEXTURE_2D,It,0)}e.bindFramebuffer(n.DRAW_FRAMEBUFFER,Mt.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.resolveDepthBuffer===!1&&l){const v=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[v])}}}function se(A){return Math.min(s.maxSamples,A.samples)}function vt(A){const v=i.get(A);return A.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function Ee(A){const v=r.render.frame;h.get(A)!==v&&(h.set(A,v),A.update())}function At(A,v){const B=A.colorSpace,$=A.format,j=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||B!==_i&&B!==ci&&(te.getTransfer(B)===re?($!==Cn||j!==ti)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",B)),v}function Pt(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(c.width=A.naturalWidth||A.width,c.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(c.width=A.displayWidth,c.height=A.displayHeight):(c.width=A.width,c.height=A.height),c}this.allocateTextureUnit=O,this.resetTextureUnits=R,this.setTexture2D=H,this.setTexture2DArray=V,this.setTexture3D=G,this.setTextureCube=q,this.rebindTextures=Rt,this.setupRenderTarget=Gt,this.updateRenderTargetMipmap=_e,this.updateMultisampleRenderTarget=ee,this.setupDepthRenderbuffer=bt,this.setupFrameBufferTexture=J,this.useMultisampledRTT=vt}function G_(n,t){function e(i,s=ci){let a;const r=te.getTransfer(s);if(i===ti)return n.UNSIGNED_BYTE;if(i===Il)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Dl)return n.UNSIGNED_SHORT_5_5_5_1;if(i===wd)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===yd)return n.BYTE;if(i===Sd)return n.SHORT;if(i===sa)return n.UNSIGNED_SHORT;if(i===Ll)return n.INT;if(i===Ni)return n.UNSIGNED_INT;if(i===Kn)return n.FLOAT;if(i===la)return n.HALF_FLOAT;if(i===bd)return n.ALPHA;if(i===Ed)return n.RGB;if(i===Cn)return n.RGBA;if(i===Td)return n.LUMINANCE;if(i===Ad)return n.LUMINANCE_ALPHA;if(i===ds)return n.DEPTH_COMPONENT;if(i===gs)return n.DEPTH_STENCIL;if(i===Cd)return n.RED;if(i===Ul)return n.RED_INTEGER;if(i===Rd)return n.RG;if(i===Nl)return n.RG_INTEGER;if(i===Ol)return n.RGBA_INTEGER;if(i===Ya||i===qa||i===$a||i===Ka)if(r===re)if(a=t.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(i===Ya)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===qa)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===$a)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Ka)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=t.get("WEBGL_compressed_texture_s3tc"),a!==null){if(i===Ya)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===qa)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===$a)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Ka)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===So||i===wo||i===bo||i===Eo)if(a=t.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(i===So)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===wo)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===bo)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Eo)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===To||i===Ao||i===Co)if(a=t.get("WEBGL_compressed_texture_etc"),a!==null){if(i===To||i===Ao)return r===re?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(i===Co)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===Ro||i===Po||i===Lo||i===Io||i===Do||i===Uo||i===No||i===Oo||i===Fo||i===zo||i===ko||i===Bo||i===Ho||i===Go)if(a=t.get("WEBGL_compressed_texture_astc"),a!==null){if(i===Ro)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Po)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Lo)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Io)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Do)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Uo)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===No)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Oo)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Fo)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===zo)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===ko)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Bo)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Ho)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Go)return r===re?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===ja||i===Xo||i===Vo)if(a=t.get("EXT_texture_compression_bptc"),a!==null){if(i===ja)return r===re?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Xo)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Vo)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Pd||i===Wo||i===Zo||i===Yo)if(a=t.get("EXT_texture_compression_rgtc"),a!==null){if(i===ja)return a.COMPRESSED_RED_RGTC1_EXT;if(i===Wo)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Zo)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Yo)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===ms?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:e}}class X_ extends fn{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}class de extends je{constructor(){super(),this.isGroup=!0,this.type="Group"}}const V_={type:"move"};class lo{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new de,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new de,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new N,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new N),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new de,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new N,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new N),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const i of t.hand.values())this._getHandJoint(e,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,i){let s=null,a=null,r=null;const o=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){r=!0;for(const _ of t.hand.values()){const m=e.getJointPose(_,i),p=this._getHandJoint(c,_);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,g=.005;c.inputState.pinching&&u>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(a=e.getPose(t.gripSpace,i),a!==null&&(l.matrix.fromArray(a.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,a.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(a.linearVelocity)):l.hasLinearVelocity=!1,a.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(a.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(s=e.getPose(t.targetRaySpace,i),s===null&&a!==null&&(s=a),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(V_)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=a!==null),c!==null&&(c.visible=r!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const i=new de;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[e.jointName]=i,t.add(i)}return t.joints[e.jointName]}}const W_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Z_=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Y_{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,i){if(this.texture===null){const s=new Ke,a=t.properties.get(s);a.__webglTexture=e.texture,(e.depthNear!=i.depthNear||e.depthFar!=i.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=s}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,i=new pi({vertexShader:W_,fragmentShader:Z_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new xt(new pn(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class q_ extends xs{constructor(t,e){super();const i=this;let s=null,a=1,r=null,o="local-floor",l=1,c=null,h=null,d=null,u=null,f=null,g=null;const _=new Y_,m=e.getContextAttributes();let p=null,S=null;const y=[],b=[],C=new Ht;let E=null;const T=new fn;T.layers.enable(1),T.viewport=new oe;const L=new fn;L.layers.enable(2),L.viewport=new oe;const w=[T,L],x=new X_;x.layers.enable(1),x.layers.enable(2);let R=null,O=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(W){let J=y[W];return J===void 0&&(J=new lo,y[W]=J),J.getTargetRaySpace()},this.getControllerGrip=function(W){let J=y[W];return J===void 0&&(J=new lo,y[W]=J),J.getGripSpace()},this.getHand=function(W){let J=y[W];return J===void 0&&(J=new lo,y[W]=J),J.getHandSpace()};function F(W){const J=b.indexOf(W.inputSource);if(J===-1)return;const mt=y[J];mt!==void 0&&(mt.update(W.inputSource,W.frame,c||r),mt.dispatchEvent({type:W.type,data:W.inputSource}))}function H(){s.removeEventListener("select",F),s.removeEventListener("selectstart",F),s.removeEventListener("selectend",F),s.removeEventListener("squeeze",F),s.removeEventListener("squeezestart",F),s.removeEventListener("squeezeend",F),s.removeEventListener("end",H),s.removeEventListener("inputsourceschange",V);for(let W=0;W<y.length;W++){const J=b[W];J!==null&&(b[W]=null,y[W].disconnect(J))}R=null,O=null,_.reset(),t.setRenderTarget(p),f=null,u=null,d=null,s=null,S=null,qt.stop(),i.isPresenting=!1,t.setPixelRatio(E),t.setSize(C.width,C.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(W){a=W,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(W){o=W,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||r},this.setReferenceSpace=function(W){c=W},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(W){if(s=W,s!==null){if(p=t.getRenderTarget(),s.addEventListener("select",F),s.addEventListener("selectstart",F),s.addEventListener("selectend",F),s.addEventListener("squeeze",F),s.addEventListener("squeezestart",F),s.addEventListener("squeezeend",F),s.addEventListener("end",H),s.addEventListener("inputsourceschange",V),m.xrCompatible!==!0&&await e.makeXRCompatible(),E=t.getPixelRatio(),t.getSize(C),s.renderState.layers===void 0){const J={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:a};f=new XRWebGLLayer(s,e,J),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),S=new Oi(f.framebufferWidth,f.framebufferHeight,{format:Cn,type:ti,colorSpace:t.outputColorSpace,stencilBuffer:m.stencil})}else{let J=null,mt=null,ht=null;m.depth&&(ht=m.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,J=m.stencil?gs:ds,mt=m.stencil?ms:Ni);const bt={colorFormat:e.RGBA8,depthFormat:ht,scaleFactor:a};d=new XRWebGLBinding(s,e),u=d.createProjectionLayer(bt),s.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),S=new Oi(u.textureWidth,u.textureHeight,{format:Cn,type:ti,depthTexture:new Xd(u.textureWidth,u.textureHeight,mt,void 0,void 0,void 0,void 0,void 0,void 0,J),stencilBuffer:m.stencil,colorSpace:t.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1})}S.isXRRenderTarget=!0,this.setFoveation(l),c=null,r=await s.requestReferenceSpace(o),qt.setContext(s),qt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function V(W){for(let J=0;J<W.removed.length;J++){const mt=W.removed[J],ht=b.indexOf(mt);ht>=0&&(b[ht]=null,y[ht].disconnect(mt))}for(let J=0;J<W.added.length;J++){const mt=W.added[J];let ht=b.indexOf(mt);if(ht===-1){for(let Rt=0;Rt<y.length;Rt++)if(Rt>=b.length){b.push(mt),ht=Rt;break}else if(b[Rt]===null){b[Rt]=mt,ht=Rt;break}if(ht===-1)break}const bt=y[ht];bt&&bt.connect(mt)}}const G=new N,q=new N;function X(W,J,mt){G.setFromMatrixPosition(J.matrixWorld),q.setFromMatrixPosition(mt.matrixWorld);const ht=G.distanceTo(q),bt=J.projectionMatrix.elements,Rt=mt.projectionMatrix.elements,Gt=bt[14]/(bt[10]-1),_e=bt[14]/(bt[10]+1),P=(bt[9]+1)/bt[5],be=(bt[9]-1)/bt[5],ee=(bt[8]-1)/bt[0],se=(Rt[8]+1)/Rt[0],vt=Gt*ee,Ee=Gt*se,At=ht/(-ee+se),Pt=At*-ee;if(J.matrixWorld.decompose(W.position,W.quaternion,W.scale),W.translateX(Pt),W.translateZ(At),W.matrixWorld.compose(W.position,W.quaternion,W.scale),W.matrixWorldInverse.copy(W.matrixWorld).invert(),bt[10]===-1)W.projectionMatrix.copy(J.projectionMatrix),W.projectionMatrixInverse.copy(J.projectionMatrixInverse);else{const A=Gt+At,v=_e+At,B=vt-Pt,$=Ee+(ht-Pt),j=P*_e/v*A,K=be*_e/v*A;W.projectionMatrix.makePerspective(B,$,j,K,A,v),W.projectionMatrixInverse.copy(W.projectionMatrix).invert()}}function lt(W,J){J===null?W.matrixWorld.copy(W.matrix):W.matrixWorld.multiplyMatrices(J.matrixWorld,W.matrix),W.matrixWorldInverse.copy(W.matrixWorld).invert()}this.updateCamera=function(W){if(s===null)return;let J=W.near,mt=W.far;_.texture!==null&&(_.depthNear>0&&(J=_.depthNear),_.depthFar>0&&(mt=_.depthFar)),x.near=L.near=T.near=J,x.far=L.far=T.far=mt,(R!==x.near||O!==x.far)&&(s.updateRenderState({depthNear:x.near,depthFar:x.far}),R=x.near,O=x.far);const ht=W.parent,bt=x.cameras;lt(x,ht);for(let Rt=0;Rt<bt.length;Rt++)lt(bt[Rt],ht);bt.length===2?X(x,T,L):x.projectionMatrix.copy(T.projectionMatrix),nt(W,x,ht)};function nt(W,J,mt){mt===null?W.matrix.copy(J.matrixWorld):(W.matrix.copy(mt.matrixWorld),W.matrix.invert(),W.matrix.multiply(J.matrixWorld)),W.matrix.decompose(W.position,W.quaternion,W.scale),W.updateMatrixWorld(!0),W.projectionMatrix.copy(J.projectionMatrix),W.projectionMatrixInverse.copy(J.projectionMatrixInverse),W.isPerspectiveCamera&&(W.fov=qo*2*Math.atan(1/W.projectionMatrix.elements[5]),W.zoom=1)}this.getCamera=function(){return x},this.getFoveation=function(){if(!(u===null&&f===null))return l},this.setFoveation=function(W){l=W,u!==null&&(u.fixedFoveation=W),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=W)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(x)};let rt=null;function zt(W,J){if(h=J.getViewerPose(c||r),g=J,h!==null){const mt=h.views;f!==null&&(t.setRenderTargetFramebuffer(S,f.framebuffer),t.setRenderTarget(S));let ht=!1;mt.length!==x.cameras.length&&(x.cameras.length=0,ht=!0);for(let Rt=0;Rt<mt.length;Rt++){const Gt=mt[Rt];let _e=null;if(f!==null)_e=f.getViewport(Gt);else{const be=d.getViewSubImage(u,Gt);_e=be.viewport,Rt===0&&(t.setRenderTargetTextures(S,be.colorTexture,u.ignoreDepthValues?void 0:be.depthStencilTexture),t.setRenderTarget(S))}let P=w[Rt];P===void 0&&(P=new fn,P.layers.enable(Rt),P.viewport=new oe,w[Rt]=P),P.matrix.fromArray(Gt.transform.matrix),P.matrix.decompose(P.position,P.quaternion,P.scale),P.projectionMatrix.fromArray(Gt.projectionMatrix),P.projectionMatrixInverse.copy(P.projectionMatrix).invert(),P.viewport.set(_e.x,_e.y,_e.width,_e.height),Rt===0&&(x.matrix.copy(P.matrix),x.matrix.decompose(x.position,x.quaternion,x.scale)),ht===!0&&x.cameras.push(P)}const bt=s.enabledFeatures;if(bt&&bt.includes("depth-sensing")){const Rt=d.getDepthInformation(mt[0]);Rt&&Rt.isValid&&Rt.texture&&_.init(t,Rt,s.renderState)}}for(let mt=0;mt<y.length;mt++){const ht=b[mt],bt=y[mt];ht!==null&&bt!==void 0&&bt.update(ht,J,c||r)}rt&&rt(W,J),J.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:J}),g=null}const qt=new Gd;qt.setAnimationLoop(zt),this.setAnimationLoop=function(W){rt=W},this.dispose=function(){}}}const bi=new Rn,$_=new ue;function K_(n,t){function e(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function i(m,p){p.color.getRGB(m.fogColor.value,kd(n)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,S,y,b){p.isMeshBasicMaterial||p.isMeshLambertMaterial?a(m,p):p.isMeshToonMaterial?(a(m,p),d(m,p)):p.isMeshPhongMaterial?(a(m,p),h(m,p)):p.isMeshStandardMaterial?(a(m,p),u(m,p),p.isMeshPhysicalMaterial&&f(m,p,b)):p.isMeshMatcapMaterial?(a(m,p),g(m,p)):p.isMeshDepthMaterial?a(m,p):p.isMeshDistanceMaterial?(a(m,p),_(m,p)):p.isMeshNormalMaterial?a(m,p):p.isLineBasicMaterial?(r(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?l(m,p,S,y):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function a(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,e(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===on&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,e(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===on&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,e(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,e(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const S=t.get(p),y=S.envMap,b=S.envMapRotation;y&&(m.envMap.value=y,bi.copy(b),bi.x*=-1,bi.y*=-1,bi.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(bi.y*=-1,bi.z*=-1),m.envMapRotation.value.setFromMatrix4($_.makeRotationFromEuler(bi)),m.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,e(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,m.aoMapTransform))}function r(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,S,y){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*S,m.scale.value=y*.5,p.map&&(m.map.value=p.map,e(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function d(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function u(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,S){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===on&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=S.texture,m.transmissionSamplerSize.value.set(S.width,S.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function _(m,p){const S=t.get(p).light;m.referencePosition.value.setFromMatrixPosition(S.matrixWorld),m.nearDistance.value=S.shadow.camera.near,m.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function j_(n,t,e,i){let s={},a={},r=[];const o=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(S,y){const b=y.program;i.uniformBlockBinding(S,b)}function c(S,y){let b=s[S.id];b===void 0&&(g(S),b=h(S),s[S.id]=b,S.addEventListener("dispose",m));const C=y.program;i.updateUBOMapping(S,C);const E=t.render.frame;a[S.id]!==E&&(u(S),a[S.id]=E)}function h(S){const y=d();S.__bindingPointIndex=y;const b=n.createBuffer(),C=S.__size,E=S.usage;return n.bindBuffer(n.UNIFORM_BUFFER,b),n.bufferData(n.UNIFORM_BUFFER,C,E),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,y,b),b}function d(){for(let S=0;S<o;S++)if(r.indexOf(S)===-1)return r.push(S),S;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(S){const y=s[S.id],b=S.uniforms,C=S.__cache;n.bindBuffer(n.UNIFORM_BUFFER,y);for(let E=0,T=b.length;E<T;E++){const L=Array.isArray(b[E])?b[E]:[b[E]];for(let w=0,x=L.length;w<x;w++){const R=L[w];if(f(R,E,w,C)===!0){const O=R.__offset,F=Array.isArray(R.value)?R.value:[R.value];let H=0;for(let V=0;V<F.length;V++){const G=F[V],q=_(G);typeof G=="number"||typeof G=="boolean"?(R.__data[0]=G,n.bufferSubData(n.UNIFORM_BUFFER,O+H,R.__data)):G.isMatrix3?(R.__data[0]=G.elements[0],R.__data[1]=G.elements[1],R.__data[2]=G.elements[2],R.__data[3]=0,R.__data[4]=G.elements[3],R.__data[5]=G.elements[4],R.__data[6]=G.elements[5],R.__data[7]=0,R.__data[8]=G.elements[6],R.__data[9]=G.elements[7],R.__data[10]=G.elements[8],R.__data[11]=0):(G.toArray(R.__data,H),H+=q.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,O,R.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function f(S,y,b,C){const E=S.value,T=y+"_"+b;if(C[T]===void 0)return typeof E=="number"||typeof E=="boolean"?C[T]=E:C[T]=E.clone(),!0;{const L=C[T];if(typeof E=="number"||typeof E=="boolean"){if(L!==E)return C[T]=E,!0}else if(L.equals(E)===!1)return L.copy(E),!0}return!1}function g(S){const y=S.uniforms;let b=0;const C=16;for(let T=0,L=y.length;T<L;T++){const w=Array.isArray(y[T])?y[T]:[y[T]];for(let x=0,R=w.length;x<R;x++){const O=w[x],F=Array.isArray(O.value)?O.value:[O.value];for(let H=0,V=F.length;H<V;H++){const G=F[H],q=_(G),X=b%C,lt=X%q.boundary,nt=X+lt;b+=lt,nt!==0&&C-nt<q.storage&&(b+=C-nt),O.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),O.__offset=b,b+=q.storage}}}const E=b%C;return E>0&&(b+=C-E),S.__size=b,S.__cache={},this}function _(S){const y={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(y.boundary=4,y.storage=4):S.isVector2?(y.boundary=8,y.storage=8):S.isVector3||S.isColor?(y.boundary=16,y.storage=12):S.isVector4?(y.boundary=16,y.storage=16):S.isMatrix3?(y.boundary=48,y.storage=48):S.isMatrix4?(y.boundary=64,y.storage=64):S.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",S),y}function m(S){const y=S.target;y.removeEventListener("dispose",m);const b=r.indexOf(y.__bindingPointIndex);r.splice(b,1),n.deleteBuffer(s[y.id]),delete s[y.id],delete a[y.id]}function p(){for(const S in s)n.deleteBuffer(s[S]);r=[],s={},a={}}return{bind:l,update:c,dispose:p}}class J_{constructor(t={}){const{canvas:e=Hf(),context:i=null,depth:s=!0,stencil:a=!1,alpha:r=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1}=t;this.isWebGLRenderer=!0;let u;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");u=i.getContextAttributes().alpha}else u=r;const f=new Uint32Array(4),g=new Int32Array(4);let _=null,m=null;const p=[],S=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=In,this.toneMapping=di,this.toneMappingExposure=1;const y=this;let b=!1,C=0,E=0,T=null,L=-1,w=null;const x=new oe,R=new oe;let O=null;const F=new Lt(0);let H=0,V=e.width,G=e.height,q=1,X=null,lt=null;const nt=new oe(0,0,V,G),rt=new oe(0,0,V,G);let zt=!1;const qt=new Hl;let W=!1,J=!1;const mt=new ue,ht=new N,bt=new oe,Rt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Gt=!1;function _e(){return T===null?q:1}let P=i;function be(M,D){return e.getContext(M,D)}try{const M={alpha:!0,depth:s,stencil:a,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${Rl}`),e.addEventListener("webglcontextlost",Z,!1),e.addEventListener("webglcontextrestored",Y,!1),e.addEventListener("webglcontextcreationerror",it,!1),P===null){const D="webgl2";if(P=be(D,M),P===null)throw be(D)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(M){throw console.error("THREE.WebGLRenderer: "+M.message),M}let ee,se,vt,Ee,At,Pt,A,v,B,$,j,K,Mt,at,dt,It,Q,ct,Vt,Tt,ut,Ct,kt,he;function I(){ee=new s0(P),ee.init(),Ct=new G_(P,ee),se=new jg(P,ee,t,Ct),vt=new k_(P),Ee=new o0(P),At=new E_,Pt=new H_(P,ee,vt,At,se,Ct,Ee),A=new Qg(y),v=new i0(y),B=new fp(P),kt=new $g(P,B),$=new a0(P,B,Ee,kt),j=new c0(P,$,B,Ee),Vt=new l0(P,se,Pt),It=new Jg(At),K=new b_(y,A,v,ee,se,kt,It),Mt=new K_(y,At),at=new A_,dt=new D_(ee),ct=new qg(y,A,v,vt,j,u,l),Q=new z_(y,j,se),he=new j_(P,Ee,se,vt),Tt=new Kg(P,ee,Ee),ut=new r0(P,ee,Ee),Ee.programs=K.programs,y.capabilities=se,y.extensions=ee,y.properties=At,y.renderLists=at,y.shadowMap=Q,y.state=vt,y.info=Ee}I();const tt=new q_(y,P);this.xr=tt,this.getContext=function(){return P},this.getContextAttributes=function(){return P.getContextAttributes()},this.forceContextLoss=function(){const M=ee.get("WEBGL_lose_context");M&&M.loseContext()},this.forceContextRestore=function(){const M=ee.get("WEBGL_lose_context");M&&M.restoreContext()},this.getPixelRatio=function(){return q},this.setPixelRatio=function(M){M!==void 0&&(q=M,this.setSize(V,G,!1))},this.getSize=function(M){return M.set(V,G)},this.setSize=function(M,D,z=!0){if(tt.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}V=M,G=D,e.width=Math.floor(M*q),e.height=Math.floor(D*q),z===!0&&(e.style.width=M+"px",e.style.height=D+"px"),this.setViewport(0,0,M,D)},this.getDrawingBufferSize=function(M){return M.set(V*q,G*q).floor()},this.setDrawingBufferSize=function(M,D,z){V=M,G=D,q=z,e.width=Math.floor(M*z),e.height=Math.floor(D*z),this.setViewport(0,0,M,D)},this.getCurrentViewport=function(M){return M.copy(x)},this.getViewport=function(M){return M.copy(nt)},this.setViewport=function(M,D,z,k){M.isVector4?nt.set(M.x,M.y,M.z,M.w):nt.set(M,D,z,k),vt.viewport(x.copy(nt).multiplyScalar(q).round())},this.getScissor=function(M){return M.copy(rt)},this.setScissor=function(M,D,z,k){M.isVector4?rt.set(M.x,M.y,M.z,M.w):rt.set(M,D,z,k),vt.scissor(R.copy(rt).multiplyScalar(q).round())},this.getScissorTest=function(){return zt},this.setScissorTest=function(M){vt.setScissorTest(zt=M)},this.setOpaqueSort=function(M){X=M},this.setTransparentSort=function(M){lt=M},this.getClearColor=function(M){return M.copy(ct.getClearColor())},this.setClearColor=function(){ct.setClearColor.apply(ct,arguments)},this.getClearAlpha=function(){return ct.getClearAlpha()},this.setClearAlpha=function(){ct.setClearAlpha.apply(ct,arguments)},this.clear=function(M=!0,D=!0,z=!0){let k=0;if(M){let U=!1;if(T!==null){const et=T.texture.format;U=et===Ol||et===Nl||et===Ul}if(U){const et=T.texture.type,ot=et===ti||et===Ni||et===sa||et===ms||et===Il||et===Dl,ft=ct.getClearColor(),pt=ct.getClearAlpha(),wt=ft.r,Et=ft.g,gt=ft.b;ot?(f[0]=wt,f[1]=Et,f[2]=gt,f[3]=pt,P.clearBufferuiv(P.COLOR,0,f)):(g[0]=wt,g[1]=Et,g[2]=gt,g[3]=pt,P.clearBufferiv(P.COLOR,0,g))}else k|=P.COLOR_BUFFER_BIT}D&&(k|=P.DEPTH_BUFFER_BIT),z&&(k|=P.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),P.clear(k)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",Z,!1),e.removeEventListener("webglcontextrestored",Y,!1),e.removeEventListener("webglcontextcreationerror",it,!1),at.dispose(),dt.dispose(),At.dispose(),A.dispose(),v.dispose(),j.dispose(),kt.dispose(),he.dispose(),K.dispose(),tt.dispose(),tt.removeEventListener("sessionstart",Ln),tt.removeEventListener("sessionend",lc),vi.stop()};function Z(M){M.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),b=!0}function Y(){console.log("THREE.WebGLRenderer: Context Restored."),b=!1;const M=Ee.autoReset,D=Q.enabled,z=Q.autoUpdate,k=Q.needsUpdate,U=Q.type;I(),Ee.autoReset=M,Q.enabled=D,Q.autoUpdate=z,Q.needsUpdate=k,Q.type=U}function it(M){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function St(M){const D=M.target;D.removeEventListener("dispose",St),Zt(D)}function Zt(M){Te(M),At.remove(M)}function Te(M){const D=At.get(M).programs;D!==void 0&&(D.forEach(function(z){K.releaseProgram(z)}),M.isShaderMaterial&&K.releaseShaderCache(M))}this.renderBufferDirect=function(M,D,z,k,U,et){D===null&&(D=Rt);const ot=U.isMesh&&U.matrixWorld.determinant()<0,ft=Hu(M,D,z,k,U);vt.setMaterial(k,ot);let pt=z.index,wt=1;if(k.wireframe===!0){if(pt=$.getWireframeAttribute(z),pt===void 0)return;wt=2}const Et=z.drawRange,gt=z.attributes.position;let jt=Et.start*wt,ve=(Et.start+Et.count)*wt;et!==null&&(jt=Math.max(jt,et.start*wt),ve=Math.min(ve,(et.start+et.count)*wt)),pt!==null?(jt=Math.max(jt,0),ve=Math.min(ve,pt.count)):gt!=null&&(jt=Math.max(jt,0),ve=Math.min(ve,gt.count));const xe=ve-jt;if(xe<0||xe===1/0)return;kt.setup(U,k,ft,z,pt);let cn,Jt=Tt;if(pt!==null&&(cn=B.get(pt),Jt=ut,Jt.setIndex(cn)),U.isMesh)k.wireframe===!0?(vt.setLineWidth(k.wireframeLinewidth*_e()),Jt.setMode(P.LINES)):Jt.setMode(P.TRIANGLES);else if(U.isLine){let _t=k.linewidth;_t===void 0&&(_t=1),vt.setLineWidth(_t*_e()),U.isLineSegments?Jt.setMode(P.LINES):U.isLineLoop?Jt.setMode(P.LINE_LOOP):Jt.setMode(P.LINE_STRIP)}else U.isPoints?Jt.setMode(P.POINTS):U.isSprite&&Jt.setMode(P.TRIANGLES);if(U.isBatchedMesh)if(U._multiDrawInstances!==null)Jt.renderMultiDrawInstances(U._multiDrawStarts,U._multiDrawCounts,U._multiDrawCount,U._multiDrawInstances);else if(ee.get("WEBGL_multi_draw"))Jt.renderMultiDraw(U._multiDrawStarts,U._multiDrawCounts,U._multiDrawCount);else{const _t=U._multiDrawStarts,Xe=U._multiDrawCounts,Qt=U._multiDrawCount,Sn=pt?B.get(pt).bytesPerElement:1,ki=At.get(k).currentProgram.getUniforms();for(let hn=0;hn<Qt;hn++)ki.setValue(P,"_gl_DrawID",hn),Jt.render(_t[hn]/Sn,Xe[hn])}else if(U.isInstancedMesh)Jt.renderInstances(jt,xe,U.count);else if(z.isInstancedBufferGeometry){const _t=z._maxInstanceCount!==void 0?z._maxInstanceCount:1/0,Xe=Math.min(z.instanceCount,_t);Jt.renderInstances(jt,xe,Xe)}else Jt.render(jt,xe)};function Ge(M,D,z){M.transparent===!0&&M.side===Un&&M.forceSinglePass===!1?(M.side=on,M.needsUpdate=!0,va(M,D,z),M.side=fi,M.needsUpdate=!0,va(M,D,z),M.side=Un):va(M,D,z)}this.compile=function(M,D,z=null){z===null&&(z=M),m=dt.get(z),m.init(D),S.push(m),z.traverseVisible(function(U){U.isLight&&U.layers.test(D.layers)&&(m.pushLight(U),U.castShadow&&m.pushShadow(U))}),M!==z&&M.traverseVisible(function(U){U.isLight&&U.layers.test(D.layers)&&(m.pushLight(U),U.castShadow&&m.pushShadow(U))}),m.setupLights();const k=new Set;return M.traverse(function(U){const et=U.material;if(et)if(Array.isArray(et))for(let ot=0;ot<et.length;ot++){const ft=et[ot];Ge(ft,z,U),k.add(ft)}else Ge(et,z,U),k.add(et)}),S.pop(),m=null,k},this.compileAsync=function(M,D,z=null){const k=this.compile(M,D,z);return new Promise(U=>{function et(){if(k.forEach(function(ot){At.get(ot).currentProgram.isReady()&&k.delete(ot)}),k.size===0){U(M);return}setTimeout(et,10)}ee.get("KHR_parallel_shader_compile")!==null?et():setTimeout(et,10)})};let Kt=null;function Gn(M){Kt&&Kt(M)}function Ln(){vi.stop()}function lc(){vi.start()}const vi=new Gd;vi.setAnimationLoop(Gn),typeof self<"u"&&vi.setContext(self),this.setAnimationLoop=function(M){Kt=M,tt.setAnimationLoop(M),M===null?vi.stop():vi.start()},tt.addEventListener("sessionstart",Ln),tt.addEventListener("sessionend",lc),this.render=function(M,D){if(D!==void 0&&D.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(b===!0)return;if(M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),D.parent===null&&D.matrixWorldAutoUpdate===!0&&D.updateMatrixWorld(),tt.enabled===!0&&tt.isPresenting===!0&&(tt.cameraAutoUpdate===!0&&tt.updateCamera(D),D=tt.getCamera()),M.isScene===!0&&M.onBeforeRender(y,M,D,T),m=dt.get(M,S.length),m.init(D),S.push(m),mt.multiplyMatrices(D.projectionMatrix,D.matrixWorldInverse),qt.setFromProjectionMatrix(mt),J=this.localClippingEnabled,W=It.init(this.clippingPlanes,J),_=at.get(M,p.length),_.init(),p.push(_),tt.enabled===!0&&tt.isPresenting===!0){const et=y.xr.getDepthSensingMesh();et!==null&&Lr(et,D,-1/0,y.sortObjects)}Lr(M,D,0,y.sortObjects),_.finish(),y.sortObjects===!0&&_.sort(X,lt),Gt=tt.enabled===!1||tt.isPresenting===!1||tt.hasDepthSensing()===!1,Gt&&ct.addToRenderList(_,M),this.info.render.frame++,W===!0&&It.beginShadows();const z=m.state.shadowsArray;Q.render(z,M,D),W===!0&&It.endShadows(),this.info.autoReset===!0&&this.info.reset();const k=_.opaque,U=_.transmissive;if(m.setupLights(),D.isArrayCamera){const et=D.cameras;if(U.length>0)for(let ot=0,ft=et.length;ot<ft;ot++){const pt=et[ot];hc(k,U,M,pt)}Gt&&ct.render(M);for(let ot=0,ft=et.length;ot<ft;ot++){const pt=et[ot];cc(_,M,pt,pt.viewport)}}else U.length>0&&hc(k,U,M,D),Gt&&ct.render(M),cc(_,M,D);T!==null&&(Pt.updateMultisampleRenderTarget(T),Pt.updateRenderTargetMipmap(T)),M.isScene===!0&&M.onAfterRender(y,M,D),kt.resetDefaultState(),L=-1,w=null,S.pop(),S.length>0?(m=S[S.length-1],W===!0&&It.setGlobalState(y.clippingPlanes,m.state.camera)):m=null,p.pop(),p.length>0?_=p[p.length-1]:_=null};function Lr(M,D,z,k){if(M.visible===!1)return;if(M.layers.test(D.layers)){if(M.isGroup)z=M.renderOrder;else if(M.isLOD)M.autoUpdate===!0&&M.update(D);else if(M.isLight)m.pushLight(M),M.castShadow&&m.pushShadow(M);else if(M.isSprite){if(!M.frustumCulled||qt.intersectsSprite(M)){k&&bt.setFromMatrixPosition(M.matrixWorld).applyMatrix4(mt);const ot=j.update(M),ft=M.material;ft.visible&&_.push(M,ot,ft,z,bt.z,null)}}else if((M.isMesh||M.isLine||M.isPoints)&&(!M.frustumCulled||qt.intersectsObject(M))){const ot=j.update(M),ft=M.material;if(k&&(M.boundingSphere!==void 0?(M.boundingSphere===null&&M.computeBoundingSphere(),bt.copy(M.boundingSphere.center)):(ot.boundingSphere===null&&ot.computeBoundingSphere(),bt.copy(ot.boundingSphere.center)),bt.applyMatrix4(M.matrixWorld).applyMatrix4(mt)),Array.isArray(ft)){const pt=ot.groups;for(let wt=0,Et=pt.length;wt<Et;wt++){const gt=pt[wt],jt=ft[gt.materialIndex];jt&&jt.visible&&_.push(M,ot,jt,z,bt.z,gt)}}else ft.visible&&_.push(M,ot,ft,z,bt.z,null)}}const et=M.children;for(let ot=0,ft=et.length;ot<ft;ot++)Lr(et[ot],D,z,k)}function cc(M,D,z,k){const U=M.opaque,et=M.transmissive,ot=M.transparent;m.setupLightsView(z),W===!0&&It.setGlobalState(y.clippingPlanes,z),k&&vt.viewport(x.copy(k)),U.length>0&&_a(U,D,z),et.length>0&&_a(et,D,z),ot.length>0&&_a(ot,D,z),vt.buffers.depth.setTest(!0),vt.buffers.depth.setMask(!0),vt.buffers.color.setMask(!0),vt.setPolygonOffset(!1)}function hc(M,D,z,k){if((z.isScene===!0?z.overrideMaterial:null)!==null)return;m.state.transmissionRenderTarget[k.id]===void 0&&(m.state.transmissionRenderTarget[k.id]=new Oi(1,1,{generateMipmaps:!0,type:ee.has("EXT_color_buffer_half_float")||ee.has("EXT_color_buffer_float")?la:ti,minFilter:Ii,samples:4,stencilBuffer:a,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:te.workingColorSpace}));const et=m.state.transmissionRenderTarget[k.id],ot=k.viewport||x;et.setSize(ot.z,ot.w);const ft=y.getRenderTarget();y.setRenderTarget(et),y.getClearColor(F),H=y.getClearAlpha(),H<1&&y.setClearColor(16777215,.5),y.clear(),Gt&&ct.render(z);const pt=y.toneMapping;y.toneMapping=di;const wt=k.viewport;if(k.viewport!==void 0&&(k.viewport=void 0),m.setupLightsView(k),W===!0&&It.setGlobalState(y.clippingPlanes,k),_a(M,z,k),Pt.updateMultisampleRenderTarget(et),Pt.updateRenderTargetMipmap(et),ee.has("WEBGL_multisampled_render_to_texture")===!1){let Et=!1;for(let gt=0,jt=D.length;gt<jt;gt++){const ve=D[gt],xe=ve.object,cn=ve.geometry,Jt=ve.material,_t=ve.group;if(Jt.side===Un&&xe.layers.test(k.layers)){const Xe=Jt.side;Jt.side=on,Jt.needsUpdate=!0,dc(xe,z,k,cn,Jt,_t),Jt.side=Xe,Jt.needsUpdate=!0,Et=!0}}Et===!0&&(Pt.updateMultisampleRenderTarget(et),Pt.updateRenderTargetMipmap(et))}y.setRenderTarget(ft),y.setClearColor(F,H),wt!==void 0&&(k.viewport=wt),y.toneMapping=pt}function _a(M,D,z){const k=D.isScene===!0?D.overrideMaterial:null;for(let U=0,et=M.length;U<et;U++){const ot=M[U],ft=ot.object,pt=ot.geometry,wt=k===null?ot.material:k,Et=ot.group;ft.layers.test(z.layers)&&dc(ft,D,z,pt,wt,Et)}}function dc(M,D,z,k,U,et){M.onBeforeRender(y,D,z,k,U,et),M.modelViewMatrix.multiplyMatrices(z.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),U.onBeforeRender(y,D,z,k,M,et),U.transparent===!0&&U.side===Un&&U.forceSinglePass===!1?(U.side=on,U.needsUpdate=!0,y.renderBufferDirect(z,D,k,U,M,et),U.side=fi,U.needsUpdate=!0,y.renderBufferDirect(z,D,k,U,M,et),U.side=Un):y.renderBufferDirect(z,D,k,U,M,et),M.onAfterRender(y,D,z,k,U,et)}function va(M,D,z){D.isScene!==!0&&(D=Rt);const k=At.get(M),U=m.state.lights,et=m.state.shadowsArray,ot=U.state.version,ft=K.getParameters(M,U.state,et,D,z),pt=K.getProgramCacheKey(ft);let wt=k.programs;k.environment=M.isMeshStandardMaterial?D.environment:null,k.fog=D.fog,k.envMap=(M.isMeshStandardMaterial?v:A).get(M.envMap||k.environment),k.envMapRotation=k.environment!==null&&M.envMap===null?D.environmentRotation:M.envMapRotation,wt===void 0&&(M.addEventListener("dispose",St),wt=new Map,k.programs=wt);let Et=wt.get(pt);if(Et!==void 0){if(k.currentProgram===Et&&k.lightsStateVersion===ot)return fc(M,ft),Et}else ft.uniforms=K.getUniforms(M),M.onBeforeCompile(ft,y),Et=K.acquireProgram(ft,pt),wt.set(pt,Et),k.uniforms=ft.uniforms;const gt=k.uniforms;return(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)&&(gt.clippingPlanes=It.uniform),fc(M,ft),k.needsLights=Xu(M),k.lightsStateVersion=ot,k.needsLights&&(gt.ambientLightColor.value=U.state.ambient,gt.lightProbe.value=U.state.probe,gt.directionalLights.value=U.state.directional,gt.directionalLightShadows.value=U.state.directionalShadow,gt.spotLights.value=U.state.spot,gt.spotLightShadows.value=U.state.spotShadow,gt.rectAreaLights.value=U.state.rectArea,gt.ltc_1.value=U.state.rectAreaLTC1,gt.ltc_2.value=U.state.rectAreaLTC2,gt.pointLights.value=U.state.point,gt.pointLightShadows.value=U.state.pointShadow,gt.hemisphereLights.value=U.state.hemi,gt.directionalShadowMap.value=U.state.directionalShadowMap,gt.directionalShadowMatrix.value=U.state.directionalShadowMatrix,gt.spotShadowMap.value=U.state.spotShadowMap,gt.spotLightMatrix.value=U.state.spotLightMatrix,gt.spotLightMap.value=U.state.spotLightMap,gt.pointShadowMap.value=U.state.pointShadowMap,gt.pointShadowMatrix.value=U.state.pointShadowMatrix),k.currentProgram=Et,k.uniformsList=null,Et}function uc(M){if(M.uniformsList===null){const D=M.currentProgram.getUniforms();M.uniformsList=Ja.seqWithValue(D.seq,M.uniforms)}return M.uniformsList}function fc(M,D){const z=At.get(M);z.outputColorSpace=D.outputColorSpace,z.batching=D.batching,z.batchingColor=D.batchingColor,z.instancing=D.instancing,z.instancingColor=D.instancingColor,z.instancingMorph=D.instancingMorph,z.skinning=D.skinning,z.morphTargets=D.morphTargets,z.morphNormals=D.morphNormals,z.morphColors=D.morphColors,z.morphTargetsCount=D.morphTargetsCount,z.numClippingPlanes=D.numClippingPlanes,z.numIntersection=D.numClipIntersection,z.vertexAlphas=D.vertexAlphas,z.vertexTangents=D.vertexTangents,z.toneMapping=D.toneMapping}function Hu(M,D,z,k,U){D.isScene!==!0&&(D=Rt),Pt.resetTextureUnits();const et=D.fog,ot=k.isMeshStandardMaterial?D.environment:null,ft=T===null?y.outputColorSpace:T.isXRRenderTarget===!0?T.texture.colorSpace:_i,pt=(k.isMeshStandardMaterial?v:A).get(k.envMap||ot),wt=k.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,Et=!!z.attributes.tangent&&(!!k.normalMap||k.anisotropy>0),gt=!!z.morphAttributes.position,jt=!!z.morphAttributes.normal,ve=!!z.morphAttributes.color;let xe=di;k.toneMapped&&(T===null||T.isXRRenderTarget===!0)&&(xe=y.toneMapping);const cn=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,Jt=cn!==void 0?cn.length:0,_t=At.get(k),Xe=m.state.lights;if(W===!0&&(J===!0||M!==w)){const gn=M===w&&k.id===L;It.setState(k,M,gn)}let Qt=!1;k.version===_t.__version?(_t.needsLights&&_t.lightsStateVersion!==Xe.state.version||_t.outputColorSpace!==ft||U.isBatchedMesh&&_t.batching===!1||!U.isBatchedMesh&&_t.batching===!0||U.isBatchedMesh&&_t.batchingColor===!0&&U.colorTexture===null||U.isBatchedMesh&&_t.batchingColor===!1&&U.colorTexture!==null||U.isInstancedMesh&&_t.instancing===!1||!U.isInstancedMesh&&_t.instancing===!0||U.isSkinnedMesh&&_t.skinning===!1||!U.isSkinnedMesh&&_t.skinning===!0||U.isInstancedMesh&&_t.instancingColor===!0&&U.instanceColor===null||U.isInstancedMesh&&_t.instancingColor===!1&&U.instanceColor!==null||U.isInstancedMesh&&_t.instancingMorph===!0&&U.morphTexture===null||U.isInstancedMesh&&_t.instancingMorph===!1&&U.morphTexture!==null||_t.envMap!==pt||k.fog===!0&&_t.fog!==et||_t.numClippingPlanes!==void 0&&(_t.numClippingPlanes!==It.numPlanes||_t.numIntersection!==It.numIntersection)||_t.vertexAlphas!==wt||_t.vertexTangents!==Et||_t.morphTargets!==gt||_t.morphNormals!==jt||_t.morphColors!==ve||_t.toneMapping!==xe||_t.morphTargetsCount!==Jt)&&(Qt=!0):(Qt=!0,_t.__version=k.version);let Sn=_t.currentProgram;Qt===!0&&(Sn=va(k,D,U));let ki=!1,hn=!1,Ir=!1;const Ae=Sn.getUniforms(),ni=_t.uniforms;if(vt.useProgram(Sn.program)&&(ki=!0,hn=!0,Ir=!0),k.id!==L&&(L=k.id,hn=!0),ki||w!==M){Ae.setValue(P,"projectionMatrix",M.projectionMatrix),Ae.setValue(P,"viewMatrix",M.matrixWorldInverse);const gn=Ae.map.cameraPosition;gn!==void 0&&gn.setValue(P,ht.setFromMatrixPosition(M.matrixWorld)),se.logarithmicDepthBuffer&&Ae.setValue(P,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2)),(k.isMeshPhongMaterial||k.isMeshToonMaterial||k.isMeshLambertMaterial||k.isMeshBasicMaterial||k.isMeshStandardMaterial||k.isShaderMaterial)&&Ae.setValue(P,"isOrthographic",M.isOrthographicCamera===!0),w!==M&&(w=M,hn=!0,Ir=!0)}if(U.isSkinnedMesh){Ae.setOptional(P,U,"bindMatrix"),Ae.setOptional(P,U,"bindMatrixInverse");const gn=U.skeleton;gn&&(gn.boneTexture===null&&gn.computeBoneTexture(),Ae.setValue(P,"boneTexture",gn.boneTexture,Pt))}U.isBatchedMesh&&(Ae.setOptional(P,U,"batchingTexture"),Ae.setValue(P,"batchingTexture",U._matricesTexture,Pt),Ae.setOptional(P,U,"batchingIdTexture"),Ae.setValue(P,"batchingIdTexture",U._indirectTexture,Pt),Ae.setOptional(P,U,"batchingColorTexture"),U._colorsTexture!==null&&Ae.setValue(P,"batchingColorTexture",U._colorsTexture,Pt));const Dr=z.morphAttributes;if((Dr.position!==void 0||Dr.normal!==void 0||Dr.color!==void 0)&&Vt.update(U,z,Sn),(hn||_t.receiveShadow!==U.receiveShadow)&&(_t.receiveShadow=U.receiveShadow,Ae.setValue(P,"receiveShadow",U.receiveShadow)),k.isMeshGouraudMaterial&&k.envMap!==null&&(ni.envMap.value=pt,ni.flipEnvMap.value=pt.isCubeTexture&&pt.isRenderTargetTexture===!1?-1:1),k.isMeshStandardMaterial&&k.envMap===null&&D.environment!==null&&(ni.envMapIntensity.value=D.environmentIntensity),hn&&(Ae.setValue(P,"toneMappingExposure",y.toneMappingExposure),_t.needsLights&&Gu(ni,Ir),et&&k.fog===!0&&Mt.refreshFogUniforms(ni,et),Mt.refreshMaterialUniforms(ni,k,q,G,m.state.transmissionRenderTarget[M.id]),Ja.upload(P,uc(_t),ni,Pt)),k.isShaderMaterial&&k.uniformsNeedUpdate===!0&&(Ja.upload(P,uc(_t),ni,Pt),k.uniformsNeedUpdate=!1),k.isSpriteMaterial&&Ae.setValue(P,"center",U.center),Ae.setValue(P,"modelViewMatrix",U.modelViewMatrix),Ae.setValue(P,"normalMatrix",U.normalMatrix),Ae.setValue(P,"modelMatrix",U.matrixWorld),k.isShaderMaterial||k.isRawShaderMaterial){const gn=k.uniformsGroups;for(let Ur=0,Vu=gn.length;Ur<Vu;Ur++){const pc=gn[Ur];he.update(pc,Sn),he.bind(pc,Sn)}}return Sn}function Gu(M,D){M.ambientLightColor.needsUpdate=D,M.lightProbe.needsUpdate=D,M.directionalLights.needsUpdate=D,M.directionalLightShadows.needsUpdate=D,M.pointLights.needsUpdate=D,M.pointLightShadows.needsUpdate=D,M.spotLights.needsUpdate=D,M.spotLightShadows.needsUpdate=D,M.rectAreaLights.needsUpdate=D,M.hemisphereLights.needsUpdate=D}function Xu(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return C},this.getActiveMipmapLevel=function(){return E},this.getRenderTarget=function(){return T},this.setRenderTargetTextures=function(M,D,z){At.get(M.texture).__webglTexture=D,At.get(M.depthTexture).__webglTexture=z;const k=At.get(M);k.__hasExternalTextures=!0,k.__autoAllocateDepthBuffer=z===void 0,k.__autoAllocateDepthBuffer||ee.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),k.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(M,D){const z=At.get(M);z.__webglFramebuffer=D,z.__useDefaultFramebuffer=D===void 0},this.setRenderTarget=function(M,D=0,z=0){T=M,C=D,E=z;let k=!0,U=null,et=!1,ot=!1;if(M){const pt=At.get(M);if(pt.__useDefaultFramebuffer!==void 0)vt.bindFramebuffer(P.FRAMEBUFFER,null),k=!1;else if(pt.__webglFramebuffer===void 0)Pt.setupRenderTarget(M);else if(pt.__hasExternalTextures)Pt.rebindTextures(M,At.get(M.texture).__webglTexture,At.get(M.depthTexture).__webglTexture);else if(M.depthBuffer){const gt=M.depthTexture;if(pt.__boundDepthTexture!==gt){if(gt!==null&&At.has(gt)&&(M.width!==gt.image.width||M.height!==gt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Pt.setupDepthRenderbuffer(M)}}const wt=M.texture;(wt.isData3DTexture||wt.isDataArrayTexture||wt.isCompressedArrayTexture)&&(ot=!0);const Et=At.get(M).__webglFramebuffer;M.isWebGLCubeRenderTarget?(Array.isArray(Et[D])?U=Et[D][z]:U=Et[D],et=!0):M.samples>0&&Pt.useMultisampledRTT(M)===!1?U=At.get(M).__webglMultisampledFramebuffer:Array.isArray(Et)?U=Et[z]:U=Et,x.copy(M.viewport),R.copy(M.scissor),O=M.scissorTest}else x.copy(nt).multiplyScalar(q).floor(),R.copy(rt).multiplyScalar(q).floor(),O=zt;if(vt.bindFramebuffer(P.FRAMEBUFFER,U)&&k&&vt.drawBuffers(M,U),vt.viewport(x),vt.scissor(R),vt.setScissorTest(O),et){const pt=At.get(M.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_CUBE_MAP_POSITIVE_X+D,pt.__webglTexture,z)}else if(ot){const pt=At.get(M.texture),wt=D||0;P.framebufferTextureLayer(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,pt.__webglTexture,z||0,wt)}L=-1},this.readRenderTargetPixels=function(M,D,z,k,U,et,ot){if(!(M&&M.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ft=At.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&ot!==void 0&&(ft=ft[ot]),ft){vt.bindFramebuffer(P.FRAMEBUFFER,ft);try{const pt=M.texture,wt=pt.format,Et=pt.type;if(!se.textureFormatReadable(wt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!se.textureTypeReadable(Et)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}D>=0&&D<=M.width-k&&z>=0&&z<=M.height-U&&P.readPixels(D,z,k,U,Ct.convert(wt),Ct.convert(Et),et)}finally{const pt=T!==null?At.get(T).__webglFramebuffer:null;vt.bindFramebuffer(P.FRAMEBUFFER,pt)}}},this.readRenderTargetPixelsAsync=async function(M,D,z,k,U,et,ot){if(!(M&&M.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ft=At.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&ot!==void 0&&(ft=ft[ot]),ft){vt.bindFramebuffer(P.FRAMEBUFFER,ft);try{const pt=M.texture,wt=pt.format,Et=pt.type;if(!se.textureFormatReadable(wt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!se.textureTypeReadable(Et))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(D>=0&&D<=M.width-k&&z>=0&&z<=M.height-U){const gt=P.createBuffer();P.bindBuffer(P.PIXEL_PACK_BUFFER,gt),P.bufferData(P.PIXEL_PACK_BUFFER,et.byteLength,P.STREAM_READ),P.readPixels(D,z,k,U,Ct.convert(wt),Ct.convert(Et),0),P.flush();const jt=P.fenceSync(P.SYNC_GPU_COMMANDS_COMPLETE,0);await Gf(P,jt,4);try{P.bindBuffer(P.PIXEL_PACK_BUFFER,gt),P.getBufferSubData(P.PIXEL_PACK_BUFFER,0,et)}finally{P.deleteBuffer(gt),P.deleteSync(jt)}return et}}finally{const pt=T!==null?At.get(T).__webglFramebuffer:null;vt.bindFramebuffer(P.FRAMEBUFFER,pt)}}},this.copyFramebufferToTexture=function(M,D=null,z=0){M.isTexture!==!0&&(qs("WebGLRenderer: copyFramebufferToTexture function signature has changed."),D=arguments[0]||null,M=arguments[1]);const k=Math.pow(2,-z),U=Math.floor(M.image.width*k),et=Math.floor(M.image.height*k),ot=D!==null?D.x:0,ft=D!==null?D.y:0;Pt.setTexture2D(M,0),P.copyTexSubImage2D(P.TEXTURE_2D,z,0,0,ot,ft,U,et),vt.unbindTexture()},this.copyTextureToTexture=function(M,D,z=null,k=null,U=0){M.isTexture!==!0&&(qs("WebGLRenderer: copyTextureToTexture function signature has changed."),k=arguments[0]||null,M=arguments[1],D=arguments[2],U=arguments[3]||0,z=null);let et,ot,ft,pt,wt,Et;z!==null?(et=z.max.x-z.min.x,ot=z.max.y-z.min.y,ft=z.min.x,pt=z.min.y):(et=M.image.width,ot=M.image.height,ft=0,pt=0),k!==null?(wt=k.x,Et=k.y):(wt=0,Et=0);const gt=Ct.convert(D.format),jt=Ct.convert(D.type);Pt.setTexture2D(D,0),P.pixelStorei(P.UNPACK_FLIP_Y_WEBGL,D.flipY),P.pixelStorei(P.UNPACK_PREMULTIPLY_ALPHA_WEBGL,D.premultiplyAlpha),P.pixelStorei(P.UNPACK_ALIGNMENT,D.unpackAlignment);const ve=P.getParameter(P.UNPACK_ROW_LENGTH),xe=P.getParameter(P.UNPACK_IMAGE_HEIGHT),cn=P.getParameter(P.UNPACK_SKIP_PIXELS),Jt=P.getParameter(P.UNPACK_SKIP_ROWS),_t=P.getParameter(P.UNPACK_SKIP_IMAGES),Xe=M.isCompressedTexture?M.mipmaps[U]:M.image;P.pixelStorei(P.UNPACK_ROW_LENGTH,Xe.width),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,Xe.height),P.pixelStorei(P.UNPACK_SKIP_PIXELS,ft),P.pixelStorei(P.UNPACK_SKIP_ROWS,pt),M.isDataTexture?P.texSubImage2D(P.TEXTURE_2D,U,wt,Et,et,ot,gt,jt,Xe.data):M.isCompressedTexture?P.compressedTexSubImage2D(P.TEXTURE_2D,U,wt,Et,Xe.width,Xe.height,gt,Xe.data):P.texSubImage2D(P.TEXTURE_2D,U,wt,Et,et,ot,gt,jt,Xe),P.pixelStorei(P.UNPACK_ROW_LENGTH,ve),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,xe),P.pixelStorei(P.UNPACK_SKIP_PIXELS,cn),P.pixelStorei(P.UNPACK_SKIP_ROWS,Jt),P.pixelStorei(P.UNPACK_SKIP_IMAGES,_t),U===0&&D.generateMipmaps&&P.generateMipmap(P.TEXTURE_2D),vt.unbindTexture()},this.copyTextureToTexture3D=function(M,D,z=null,k=null,U=0){M.isTexture!==!0&&(qs("WebGLRenderer: copyTextureToTexture3D function signature has changed."),z=arguments[0]||null,k=arguments[1]||null,M=arguments[2],D=arguments[3],U=arguments[4]||0);let et,ot,ft,pt,wt,Et,gt,jt,ve;const xe=M.isCompressedTexture?M.mipmaps[U]:M.image;z!==null?(et=z.max.x-z.min.x,ot=z.max.y-z.min.y,ft=z.max.z-z.min.z,pt=z.min.x,wt=z.min.y,Et=z.min.z):(et=xe.width,ot=xe.height,ft=xe.depth,pt=0,wt=0,Et=0),k!==null?(gt=k.x,jt=k.y,ve=k.z):(gt=0,jt=0,ve=0);const cn=Ct.convert(D.format),Jt=Ct.convert(D.type);let _t;if(D.isData3DTexture)Pt.setTexture3D(D,0),_t=P.TEXTURE_3D;else if(D.isDataArrayTexture||D.isCompressedArrayTexture)Pt.setTexture2DArray(D,0),_t=P.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}P.pixelStorei(P.UNPACK_FLIP_Y_WEBGL,D.flipY),P.pixelStorei(P.UNPACK_PREMULTIPLY_ALPHA_WEBGL,D.premultiplyAlpha),P.pixelStorei(P.UNPACK_ALIGNMENT,D.unpackAlignment);const Xe=P.getParameter(P.UNPACK_ROW_LENGTH),Qt=P.getParameter(P.UNPACK_IMAGE_HEIGHT),Sn=P.getParameter(P.UNPACK_SKIP_PIXELS),ki=P.getParameter(P.UNPACK_SKIP_ROWS),hn=P.getParameter(P.UNPACK_SKIP_IMAGES);P.pixelStorei(P.UNPACK_ROW_LENGTH,xe.width),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,xe.height),P.pixelStorei(P.UNPACK_SKIP_PIXELS,pt),P.pixelStorei(P.UNPACK_SKIP_ROWS,wt),P.pixelStorei(P.UNPACK_SKIP_IMAGES,Et),M.isDataTexture||M.isData3DTexture?P.texSubImage3D(_t,U,gt,jt,ve,et,ot,ft,cn,Jt,xe.data):D.isCompressedArrayTexture?P.compressedTexSubImage3D(_t,U,gt,jt,ve,et,ot,ft,cn,xe.data):P.texSubImage3D(_t,U,gt,jt,ve,et,ot,ft,cn,Jt,xe),P.pixelStorei(P.UNPACK_ROW_LENGTH,Xe),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,Qt),P.pixelStorei(P.UNPACK_SKIP_PIXELS,Sn),P.pixelStorei(P.UNPACK_SKIP_ROWS,ki),P.pixelStorei(P.UNPACK_SKIP_IMAGES,hn),U===0&&D.generateMipmaps&&P.generateMipmap(_t),vt.unbindTexture()},this.initRenderTarget=function(M){At.get(M).__webglFramebuffer===void 0&&Pt.setupRenderTarget(M)},this.initTexture=function(M){M.isCubeTexture?Pt.setTextureCube(M,0):M.isData3DTexture?Pt.setTexture3D(M,0):M.isDataArrayTexture||M.isCompressedArrayTexture?Pt.setTexture2DArray(M,0):Pt.setTexture2D(M,0),vt.unbindTexture()},this.resetState=function(){C=0,E=0,T=null,vt.reset(),kt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return jn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorSpace=t===zl?"display-p3":"srgb",e.unpackColorSpace=te.workingColorSpace===yr?"display-p3":"srgb"}}class Xl{constructor(t,e=1,i=1e3){this.isFog=!0,this.name="",this.color=new Lt(t),this.near=e,this.far=i}clone(){return new Xl(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class Q_ extends je{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Rn,this.environmentIntensity=1,this.environmentRotation=new Rn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class qe extends Ke{constructor(t,e,i,s,a,r,o,l,c){super(t,e,i,s,a,r,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Vl extends Pn{constructor(t=1,e=32,i=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:i,thetaLength:s},e=Math.max(3,e);const a=[],r=[],o=[],l=[],c=new N,h=new Ht;r.push(0,0,0),o.push(0,0,1),l.push(.5,.5);for(let d=0,u=3;d<=e;d++,u+=3){const f=i+d/e*s;c.x=t*Math.cos(f),c.y=t*Math.sin(f),r.push(c.x,c.y,c.z),o.push(0,0,1),h.x=(r[u]/t+1)/2,h.y=(r[u+1]/t+1)/2,l.push(h.x,h.y)}for(let d=1;d<=e;d++)a.push(d,d+1,0);this.setIndex(a),this.setAttribute("position",new Be(r,3)),this.setAttribute("normal",new Be(o,3)),this.setAttribute("uv",new Be(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Vl(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class vs extends Pn{constructor(t=1,e=1,i=1,s=32,a=1,r=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:i,radialSegments:s,heightSegments:a,openEnded:r,thetaStart:o,thetaLength:l};const c=this;s=Math.floor(s),a=Math.floor(a);const h=[],d=[],u=[],f=[];let g=0;const _=[],m=i/2;let p=0;S(),r===!1&&(t>0&&y(!0),e>0&&y(!1)),this.setIndex(h),this.setAttribute("position",new Be(d,3)),this.setAttribute("normal",new Be(u,3)),this.setAttribute("uv",new Be(f,2));function S(){const b=new N,C=new N;let E=0;const T=(e-t)/i;for(let L=0;L<=a;L++){const w=[],x=L/a,R=x*(e-t)+t;for(let O=0;O<=s;O++){const F=O/s,H=F*l+o,V=Math.sin(H),G=Math.cos(H);C.x=R*V,C.y=-x*i+m,C.z=R*G,d.push(C.x,C.y,C.z),b.set(V,T,G).normalize(),u.push(b.x,b.y,b.z),f.push(F,1-x),w.push(g++)}_.push(w)}for(let L=0;L<s;L++)for(let w=0;w<a;w++){const x=_[w][L],R=_[w+1][L],O=_[w+1][L+1],F=_[w][L+1];h.push(x,R,F),h.push(R,O,F),E+=6}c.addGroup(p,E,0),p+=E}function y(b){const C=g,E=new Ht,T=new N;let L=0;const w=b===!0?t:e,x=b===!0?1:-1;for(let O=1;O<=s;O++)d.push(0,m*x,0),u.push(0,x,0),f.push(.5,.5),g++;const R=g;for(let O=0;O<=s;O++){const H=O/s*l+o,V=Math.cos(H),G=Math.sin(H);T.x=w*G,T.y=m*x,T.z=w*V,d.push(T.x,T.y,T.z),u.push(0,x,0),E.x=V*.5+.5,E.y=G*.5*x+.5,f.push(E.x,E.y),g++}for(let O=0;O<s;O++){const F=C+O,H=R+O;b===!0?h.push(H,H+1,F):h.push(H+1,H,F),L+=3}c.addGroup(p,L,b===!0?1:2),p+=L}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new vs(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class lr extends Pn{constructor(t=1,e=32,i=16,s=0,a=Math.PI*2,r=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:i,phiStart:s,phiLength:a,thetaStart:r,thetaLength:o},e=Math.max(3,Math.floor(e)),i=Math.max(2,Math.floor(i));const l=Math.min(r+o,Math.PI);let c=0;const h=[],d=new N,u=new N,f=[],g=[],_=[],m=[];for(let p=0;p<=i;p++){const S=[],y=p/i;let b=0;p===0&&r===0?b=.5/e:p===i&&l===Math.PI&&(b=-.5/e);for(let C=0;C<=e;C++){const E=C/e;d.x=-t*Math.cos(s+E*a)*Math.sin(r+y*o),d.y=t*Math.cos(r+y*o),d.z=t*Math.sin(s+E*a)*Math.sin(r+y*o),g.push(d.x,d.y,d.z),u.copy(d).normalize(),_.push(u.x,u.y,u.z),m.push(E+b,1-y),S.push(c++)}h.push(S)}for(let p=0;p<i;p++)for(let S=0;S<e;S++){const y=h[p][S+1],b=h[p][S],C=h[p+1][S],E=h[p+1][S+1];(p!==0||r>0)&&f.push(y,b,E),(p!==i-1||l<Math.PI)&&f.push(b,C,E)}this.setIndex(f),this.setAttribute("position",new Be(g,3)),this.setAttribute("normal",new Be(_,3)),this.setAttribute("uv",new Be(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new lr(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class $s extends Ms{constructor(t){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new Lt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Lt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Fl,this.normalScale=new Ht(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Rn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Pe extends Ms{constructor(t){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Lt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Lt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Fl,this.normalScale=new Ht(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Rn,this.combine=Pl,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Wl extends je{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Lt(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}class tv extends Wl{constructor(t,e,i){super(t,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(je.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Lt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}}const co=new ue,dh=new N,uh=new N;class ev{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ht(512,512),this.map=null,this.mapPass=null,this.matrix=new ue,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Hl,this._frameExtents=new Ht(1,1),this._viewportCount=1,this._viewports=[new oe(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,i=this.matrix;dh.setFromMatrixPosition(t.matrixWorld),e.position.copy(dh),uh.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(uh),e.updateMatrixWorld(),co.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(co),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(co)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}const fh=new ue,Cs=new N,ho=new N;class nv extends ev{constructor(){super(new fn(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new Ht(4,2),this._viewportCount=6,this._viewports=[new oe(2,1,1,1),new oe(0,1,1,1),new oe(3,1,1,1),new oe(1,1,1,1),new oe(3,0,1,1),new oe(1,0,1,1)],this._cubeDirections=[new N(1,0,0),new N(-1,0,0),new N(0,0,1),new N(0,0,-1),new N(0,1,0),new N(0,-1,0)],this._cubeUps=[new N(0,1,0),new N(0,1,0),new N(0,1,0),new N(0,1,0),new N(0,0,1),new N(0,0,-1)]}updateMatrices(t,e=0){const i=this.camera,s=this.matrix,a=t.distance||i.far;a!==i.far&&(i.far=a,i.updateProjectionMatrix()),Cs.setFromMatrixPosition(t.matrixWorld),i.position.copy(Cs),ho.copy(i.position),ho.add(this._cubeDirections[e]),i.up.copy(this._cubeUps[e]),i.lookAt(ho),i.updateMatrixWorld(),s.makeTranslation(-Cs.x,-Cs.y,-Cs.z),fh.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),this._frustum.setFromProjectionMatrix(fh)}}class iv extends Wl{constructor(t,e,i=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=s,this.shadow=new nv}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}}class sv extends Wl{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}}class av{constructor(t=!0){this.autoStart=t,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=ph(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let t=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const e=ph();t=(e-this.oldTime)/1e3,this.oldTime=e,this.elapsedTime+=t}return t}}function ph(){return(typeof performance>"u"?Date:performance).now()}const mh=new ue;class rv{constructor(t,e,i=0,s=1/0){this.ray=new Nd(t,e),this.near=i,this.far=s,this.camera=null,this.layers=new Bl,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,(e.near+e.far)/(e.near-e.far)).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):console.error("THREE.Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return mh.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(mh),this}intersectObject(t,e=!0,i=[]){return Ko(t,this,i,e),i.sort(gh),i}intersectObjects(t,e=!0,i=[]){for(let s=0,a=t.length;s<a;s++)Ko(t[s],this,i,e);return i.sort(gh),i}}function gh(n,t){return n.distance-t.distance}function Ko(n,t,e,i){let s=!0;if(n.layers.test(t.layers)&&n.raycast(t,e)===!1&&(s=!1),s===!0&&i===!0){const a=n.children;for(let r=0,o=a.length;r<o;r++)Ko(a[r],t,e,!0)}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Rl}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Rl);const _h="wardb-5ceefd8900e9ab12a230f960e89c0ea5c7eb4559",Bt={player:{speed:3.4,radius:.35,eyeHeight:1.62,lookSensitivity:.0024,touchLookScale:1.9},pills:{max:1},medication:{durationSec:45,warnSec:12},lastWard:{startGapM:5,minGapM:1,closePerSideMps:.25,warnGapM:3.5,tightGapM:2,orderlySightRangeM:9,orderlyConeDeg:80},camera:{fov:72,shiftFovKick:82},interact:{maxDistance:2.7},telemetry:{positionSampleMs:2e3,flushMs:15e3,idleThresholdMs:2e4,perfIntervalMs:3e4},orderly:{speed:1.5,chaseSpeed:4.3,radius:.4,catchRadius:.55,escapePauseSec:.6,sightRange:6,coneDeg:55,graceSec:.6,warnAt:.5,pauseAtWaypoint:.8}};function ov(n){return n==="lucid"?{fogColor:new Lt(14148831),fogNear:9,fogFar:30,hemi:.85,amb:.28,pointIntensity:.7,pointColor:new Lt(15925243)}:{fogColor:new Lt(1510154),fogNear:2.6,fogFar:13,hemi:.17,amb:.13,pointIntensity:.5,pointColor:new Lt(16724772)}}function lv(){const t=document.createElement("canvas");t.width=96,t.height=96;const e=t.getContext("2d"),i=e.createImageData(96,96);for(let s=0;s<i.data.length;s+=4){const a=Math.floor(Math.random()*255);i.data[s]=a,i.data[s+1]=a,i.data[s+2]=a,i.data[s+3]=255}return e.putImageData(i,0,0),t.toDataURL()}const cs=class cs{constructor(t){this.roomLights=[],this.moodInitialized=!1,this.darkOverride=!1,this.fogNearBase=9,this.fogFarBase=30,this.grainEl=document.getElementById("grain"),this.grainOpacity=.025,this.scene=new Q_,this.camera=new fn(Bt.camera.fov,window.innerWidth/window.innerHeight,.05,100),this.camera.rotation.order="YXZ",this.webgl=new J_({antialias:!0}),this.webgl.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.webgl.setSize(window.innerWidth,window.innerHeight),t.appendChild(this.webgl.domElement),window.addEventListener("resize",()=>{this.camera.aspect=window.innerWidth/window.innerHeight,this.camera.updateProjectionMatrix(),this.webgl.setSize(window.innerWidth,window.innerHeight)}),this.hemi=new tv(15400954,2897973,.85),this.scene.add(this.hemi),this.amb=new sv(16777215,.28),this.scene.add(this.amb),this.scene.fog=new Xl(14674148,9,30),this.grainEl&&(this.grainEl.style.backgroundImage=`url(${lv()})`,this.grainEl.style.backgroundSize="160px 160px",this.grainEl.style.opacity=String(this.grainOpacity))}setRoomLights(t){var e;for(const i of this.roomLights){this.scene.remove(i);const s=i;(e=s.dispose)==null||e.call(s)}this.roomLights=t.map(([i,s])=>{const a=new iv(15925243,.7,12);return a.position.set(i,2.7,s),this.scene.add(a),a})}setDark(t){this.darkOverride=t}fovKick(){this.camera.fov=Bt.camera.shiftFovKick,this.camera.updateProjectionMatrix()}update(t,e,i){const s=ov(i);this.darkOverride&&(s.hemi*=cs.DARK_MULTIPLIER,s.amb*=cs.DARK_MULTIPLIER,s.pointIntensity*=cs.DARK_MULTIPLIER,s.fogNear*=.5,s.fogFar*=.45);const a=this.scene.fog;if(!this.moodInitialized){a.color.copy(s.fogColor),this.fogNearBase=s.fogNear,this.fogFarBase=s.fogFar,a.near=s.fogNear,a.far=s.fogFar,this.hemi.intensity=s.hemi,this.amb.intensity=s.amb;for(const l of this.roomLights)l.color.copy(s.pointColor),l.intensity=s.pointIntensity;this.moodInitialized=!0}const r=Math.min(1,t*2.2);a.color.lerp(s.fogColor,r),this.fogNearBase+=(s.fogNear-this.fogNearBase)*r,this.fogFarBase+=(s.fogFar-this.fogFarBase)*r,this.hemi.intensity+=(s.hemi-this.hemi.intensity)*r,this.amb.intensity+=(s.amb-this.amb.intensity)*r,this.webgl.setClearColor(a.color);const o=i==="unmed"?1+Math.sin(e*.5)*.05:1;if(a.near=this.fogNearBase*o,a.far=this.fogFarBase*o,this.roomLights.forEach((l,c)=>{l.color.lerp(s.pointColor,r);const h=i==="unmed"?(Math.random()<.06?.25:1)*(.8+.2*Math.sin(e*13+c*7)):1;l.intensity+=(s.pointIntensity*h-l.intensity)*Math.min(1,t*8)}),this.camera.fov>Bt.camera.fov+.05&&(this.camera.fov+=(Bt.camera.fov-this.camera.fov)*Math.min(1,t*6),this.camera.updateProjectionMatrix()),this.grainEl){const l=i==="unmed"?.04:.025;this.grainOpacity+=(l-this.grainOpacity)*r,this.grainEl.style.opacity=String(this.grainOpacity);const c=e*41%160,h=e*29%160;this.grainEl.style.backgroundPosition=`${c}px ${h}px`}}render(){this.webgl.render(this.scene,this.camera)}};cs.DARK_MULTIPLIER=.12;let jo=cs;class cv{constructor(t){this.enabled=!1,this.onInteract=null,this.onShift=null,this.keys={},this.plActive=!1,this.dragging=!1,this.dragLastX=0,this.dragLastY=0,this.lookDX=0,this.lookDY=0,this.moveTouch=null,this.lookTouch=null,this.stickVec={x:0,y:0},this.stickBase={x:0,y:0},this.touchLookLastX=0,this.touchLookLastY=0,this.canvas=t,this.isTouch="ontouchstart"in window&&matchMedia("(pointer:coarse)").matches,this.isTouch&&document.body.classList.add("touch"),this.stickEl=document.getElementById("stick"),this.nubEl=document.getElementById("nub"),this.bindKeyboard(),this.bindMouse(),this.bindTouch(),this.bindButtons()}bindKeyboard(){window.addEventListener("keydown",t=>{var e,i;this.keys[t.code]=!0,this.enabled&&(t.code==="KeyE"&&((e=this.onInteract)==null||e.call(this)),t.code==="KeyQ"&&((i=this.onShift)==null||i.call(this)))}),window.addEventListener("keyup",t=>{this.keys[t.code]=!1})}bindMouse(){this.canvas.addEventListener("click",()=>{if(!(!this.enabled||this.isTouch)&&!this.plActive)try{this.canvas.requestPointerLock()}catch{}}),document.addEventListener("pointerlockchange",()=>{this.plActive=document.pointerLockElement===this.canvas}),window.addEventListener("mousemove",t=>{this.enabled&&(this.plActive?(this.lookDX+=t.movementX,this.lookDY+=t.movementY):this.dragging&&(this.lookDX+=t.clientX-this.dragLastX,this.lookDY+=t.clientY-this.dragLastY,this.dragLastX=t.clientX,this.dragLastY=t.clientY))}),this.canvas.addEventListener("mousedown",t=>{this.plActive||(this.dragging=!0,this.dragLastX=t.clientX,this.dragLastY=t.clientY)}),window.addEventListener("mouseup",()=>{this.dragging=!1})}bindTouch(){window.addEventListener("touchstart",e=>{var i;if(this.enabled)for(const s of Array.from(e.changedTouches)){const a=s.target;if(!(a!=null&&a.closest&&(a.closest(".tbtn")||a.closest(".overlay"))))if(s.clientX<window.innerWidth*.45&&this.moveTouch===null){this.moveTouch=s.identifier;const r=(i=this.stickEl)==null?void 0:i.getBoundingClientRect();this.stickBase=r?{x:r.left+r.width/2,y:r.top+r.height/2}:{x:0,y:0}}else this.lookTouch===null&&(this.lookTouch=s.identifier,this.touchLookLastX=s.clientX,this.touchLookLastY=s.clientY)}},{passive:!0}),window.addEventListener("touchmove",e=>{for(const i of Array.from(e.changedTouches))if(i.identifier===this.moveTouch){let s=i.clientX-this.stickBase.x,a=i.clientY-this.stickBase.y;const r=Math.hypot(s,a),o=48;r>o&&(s*=o/r,a*=o/r),this.stickVec={x:s/o,y:a/o},this.nubEl&&(this.nubEl.style.transform=`translate(${s}px,${a}px)`)}else if(i.identifier===this.lookTouch){const s=(i.clientX-this.touchLookLastX)*Bt.player.touchLookScale,a=(i.clientY-this.touchLookLastY)*Bt.player.touchLookScale;this.lookDX+=s,this.lookDY+=a,this.touchLookLastX=i.clientX,this.touchLookLastY=i.clientY}},{passive:!0});const t=e=>{for(const i of Array.from(e.changedTouches))i.identifier===this.moveTouch&&(this.moveTouch=null,this.stickVec={x:0,y:0},this.nubEl&&(this.nubEl.style.transform="")),i.identifier===this.lookTouch&&(this.lookTouch=null)};window.addEventListener("touchend",t),window.addEventListener("touchcancel",t)}bindButtons(){var t,e;(t=document.getElementById("btnAct"))==null||t.addEventListener("click",()=>{var i;this.enabled&&((i=this.onInteract)==null||i.call(this))}),(e=document.getElementById("btnShift"))==null||e.addEventListener("click",()=>{var i;this.enabled&&((i=this.onShift)==null||i.call(this))})}moveAxes(){if(!this.enabled)return{f:0,s:0};let t=0,e=0;(this.keys.KeyW||this.keys.ArrowUp)&&(t+=1),(this.keys.KeyS||this.keys.ArrowDown)&&(t-=1),(this.keys.KeyA||this.keys.ArrowLeft)&&(e-=1),(this.keys.KeyD||this.keys.ArrowRight)&&(e+=1),t+=-this.stickVec.y,e+=this.stickVec.x;const i=Math.hypot(t,e);return i>0&&(t/=Math.max(1,i),e/=Math.max(1,i)),{f:t,s:e}}consumeLook(){const t={dx:this.lookDX,dy:this.lookDY};return this.lookDX=0,this.lookDY=0,t}releasePointerLock(){document.pointerLockElement&&document.exitPointerLock()}}class hv{constructor(){this.actx=null,this.osc=null,this.filt=null,this.gain=null,this.threatChaseGain=null,this.threatLastTime=null,this.threatFootstepPhase=0,this.threatHeartbeatPhase=0,this.medWarnGain=null}init(){if(this.actx){this.actx.state==="suspended"&&this.actx.resume().catch(()=>{});return}try{const t=window.AudioContext||window.webkitAudioContext;this.actx=new t,this.osc=this.actx.createOscillator(),this.filt=this.actx.createBiquadFilter(),this.gain=this.actx.createGain(),this.osc.type="sawtooth",this.osc.frequency.value=55,this.filt.type="lowpass",this.filt.frequency.value=180,this.gain.gain.value=0,this.osc.connect(this.filt),this.filt.connect(this.gain),this.gain.connect(this.actx.destination),this.osc.start(),this.actx.state==="suspended"&&this.actx.resume().catch(()=>{})}catch{this.actx=null,this.osc=null,this.filt=null,this.gain=null}}setState(t){if(!this.actx||!this.gain||!this.osc)return;const e=t==="unmed"?.028:.006,i=t==="unmed"?55:190;try{this.gain.gain.setTargetAtTime(e,this.actx.currentTime,.6),this.osc.frequency.setTargetAtTime(i,this.actx.currentTime,.6),this.osc.type=t==="unmed"?"sawtooth":"sine"}catch{}}shiftStinger(){if(this.actx)try{const t=this.actx,e=.3,i=t.createBuffer(1,t.sampleRate*e,t.sampleRate),s=i.getChannelData(0);for(let l=0;l<s.length;l++)s[l]=(Math.random()*2-1)*(1-l/s.length);const a=t.createBufferSource();a.buffer=i;const r=t.createBiquadFilter();r.type="bandpass",r.frequency.value=700,r.Q.value=.7;const o=t.createGain();o.gain.value=.05,a.connect(r),r.connect(o),o.connect(t.destination),a.start(),a.stop(t.currentTime+e)}catch{}}medicationExpiredCue(){if(this.actx)try{const t=this.actx,e=.55,i=t.createBuffer(1,t.sampleRate*e,t.sampleRate),s=i.getChannelData(0);for(let h=0;h<s.length;h++)s[h]=(Math.random()*2-1)*(1-h/s.length);const a=t.createBufferSource();a.buffer=i;const r=t.createBiquadFilter();r.type="bandpass",r.frequency.value=220,r.Q.value=.6;const o=t.createGain();o.gain.value=.07,a.connect(r),r.connect(o),o.connect(t.destination),a.start(),a.stop(t.currentTime+e);const l=t.createOscillator();l.type="sine",l.frequency.setValueAtTime(140,t.currentTime),l.frequency.exponentialRampToValueAtTime(38,t.currentTime+e);const c=t.createGain();c.gain.setValueAtTime(.05,t.currentTime),c.gain.exponentialRampToValueAtTime(1e-4,t.currentTime+e),l.connect(c),c.connect(t.destination),l.start(),l.stop(t.currentTime+e)}catch{}}dispenserClunk(){if(this.actx)try{const t=this.actx,e=.15,i=t.createOscillator();i.type="square",i.frequency.setValueAtTime(120,t.currentTime),i.frequency.exponentialRampToValueAtTime(45,t.currentTime+e);const s=t.createGain();s.gain.setValueAtTime(.09,t.currentTime),s.gain.exponentialRampToValueAtTime(1e-4,t.currentTime+e),i.connect(s),s.connect(t.destination),i.start(),i.stop(t.currentTime+e)}catch{}}ensureThreatChaseNodes(){if(!(this.threatChaseGain||!this.actx))try{const t=this.actx,e=t.createOscillator();e.type="sine",e.frequency.value=1650;const i=t.createBiquadFilter();i.type="bandpass",i.frequency.value=1650,i.Q.value=9;const s=t.createGain();s.gain.value=0,e.connect(i),i.connect(s),s.connect(t.destination),e.start();const a=t.createOscillator();a.type="sine",a.frequency.value=6.2;const r=t.createGain();r.gain.value=18,a.connect(r),r.connect(e.frequency),a.start(),this.threatChaseGain=s}catch{this.threatChaseGain=null}}ensureMedWarnNodes(){if(!(this.medWarnGain||!this.actx))try{const t=this.actx,e=t.createOscillator();e.type="sine",e.frequency.value=92;const i=t.createBiquadFilter();i.type="lowpass",i.frequency.value=260;const s=t.createGain();s.gain.value=0,e.connect(i),i.connect(s),s.connect(t.destination),e.start();const a=t.createOscillator();a.type="sine",a.frequency.value=3.4;const r=t.createGain();r.gain.value=10,a.connect(r),r.connect(e.frequency),a.start(),this.medWarnGain=s}catch{this.medWarnGain=null}}setMedicationWarning(t){if(this.actx)try{if(t&&this.ensureMedWarnNodes(),this.medWarnGain){const e=t?.022:0;this.medWarnGain.gain.setTargetAtTime(e,this.actx.currentTime,t?.5:.6)}}catch{}}triggerFootstep(t){if(this.actx)try{const e=this.actx,i=.11,s=e.createOscillator();s.type="sine",s.frequency.setValueAtTime(110,e.currentTime),s.frequency.exponentialRampToValueAtTime(58,e.currentTime+i);const a=e.createGain(),r=.05*t;a.gain.setValueAtTime(1e-4,e.currentTime),a.gain.exponentialRampToValueAtTime(Math.max(2e-4,r),e.currentTime+.012),a.gain.exponentialRampToValueAtTime(1e-4,e.currentTime+i),s.connect(a),a.connect(e.destination),s.start(),s.stop(e.currentTime+i)}catch{}}triggerHeartbeat(t){if(this.actx)try{const e=this.actx,i=.02+.06*t,s=(r,o,l,c)=>{const h=e.createOscillator();h.type="sine",h.frequency.setValueAtTime(o,r),h.frequency.exponentialRampToValueAtTime(o*.6,r+l);const d=e.createGain();d.gain.setValueAtTime(1e-4,r),d.gain.exponentialRampToValueAtTime(Math.max(2e-4,i*c),r+.015),d.gain.exponentialRampToValueAtTime(1e-4,r+l),h.connect(d),d.connect(e.destination),h.start(r),h.stop(r+l)},a=e.currentTime;s(a,62,.13,1),s(a+.16,52,.15,.75)}catch{}}setThreat(t,e,i){if(this.actx)try{const a=this.actx.currentTime,r=this.threatLastTime===null?0:Math.max(0,Math.min(.25,a-this.threatLastTime));this.threatLastTime=a;const o=Number.isFinite(e)?Math.max(0,Math.min(1,1-e/8)):0;if(o<=.003)this.threatFootstepPhase=0;else{const c=i?.34444444444444444:.62;this.threatFootstepPhase+=r,this.threatFootstepPhase>=c&&(this.threatFootstepPhase=this.threatFootstepPhase%c,this.triggerFootstep(o))}const l=Math.max(0,Math.min(1,(t-.3)/.7));if(l<=.003)this.threatHeartbeatPhase=0;else{const c=1.1-.65*l;this.threatHeartbeatPhase+=r,this.threatHeartbeatPhase>=c&&(this.threatHeartbeatPhase=this.threatHeartbeatPhase%c,this.triggerHeartbeat(l))}if(i&&this.ensureThreatChaseNodes(),this.threatChaseGain){const c=i?.032:0;this.threatChaseGain.gain.setTargetAtTime(c,a,i?.1:.22)}}catch{}}}function vh(n,t){return n.states===void 0||n.states==="both"||n.states===t}function Jo(n,t){return n.level===void 0||n.level===t}function qd(n,t,e,i,s,a){const r=n.r;let o=!0;for(const l of i)if(!(!vh(l,s)||!Jo(l,a))&&t>l.minX-r&&t<l.maxX+r&&n.z>l.minZ-r&&n.z<l.maxZ+r){o=!1;break}o&&(n.x=t),o=!0;for(const l of i)if(!(!vh(l,s)||!Jo(l,a))&&n.x>l.minX-r&&n.x<l.maxX+r&&e>l.minZ-r&&e<l.maxZ+r){o=!1;break}o&&(n.z=e)}function dv(n,t,e,i,s){for(const a of i)if(!(a.states!=="unmed"||!Jo(a,s))&&n>a.minX-e&&n<a.maxX+e&&t>a.minZ-e&&t<a.maxZ+e)return!0;return!1}class uv{constructor(){this.state="unmed",this.canShift=!1,this.pills=0,this.maxPills=Bt.pills.max,this.medication=0,this.onChange=null}shift(){var e;if(!this.canShift)return"no-ability";const t=this.state;if(t==="unmed"){if(this.pills<=0)return"no-pills";this.pills-=1,this.state="lucid",this.medication=1}else this.state="unmed";return(e=this.onChange)==null||e.call(this,this.state,t,"manual"),"ok"}forceState(t,e){var s;const i=this.state;i!==t&&(this.state=t,t==="lucid"&&(this.medication=1),(s=this.onChange)==null||s.call(this,t,i,e))}tickMedication(t){return this.state!=="lucid"||!this.canShift?!1:(this.medication=Math.max(0,this.medication-t/Bt.medication.durationSec),this.medication<=0)}refill(){return this.pills=this.maxPills,this.pills}}class fv{constructor(){this.map=new Map}get(t){return this.map.get(t)}set(t,e){this.map.set(t,e)}has(t){return this.map.has(t)}reset(){this.map.clear()}}class pv{constructor(){this.x=0,this.z=0,this.y=0,this.yaw=0,this.pitch=0,this.level="__flat",this.r=Bt.player.radius,this.h=Bt.player.eyeHeight,this.wasMoving=!1}spawn(t){this.x=t.x,this.z=t.z,this.y=t.y??0,this.yaw=t.yaw,this.pitch=0,this.level=t.level??"__flat"}update(t,e,i,s){const a=e.consumeLook();this.yaw-=a.dx*Bt.player.lookSensitivity,this.pitch=Math.max(-1.45,Math.min(1.45,this.pitch-a.dy*Bt.player.lookSensitivity));const r=e.moveAxes();let o=r.f,l=r.s;const c=Math.hypot(o,l);if(this.wasMoving=c>0,c>0){o/=Math.max(1,c),l/=Math.max(1,c);const h=Bt.player.speed*t,d=Math.sin(this.yaw),u=Math.cos(this.yaw),f=(l*u-o*d)*h,g=(-o*u-l*d)*h;qd(this,this.x+f,this.z+g,i,s,this.level)}}syncCamera(t,e,i){const s=this.wasMoving?Math.sin(e*9)*.035:0,a=i==="unmed"?Math.sin(e*.7)*.02:0;t.position.set(this.x,this.y+this.h+s,this.z),t.rotation.set(this.pitch,this.yaw,a)}get moving(){return this.wasMoving}}const mv="__flat",Ha=1;function gv(n,t,e,i){for(const s of i){if(s.axis==="x"){if(e<s.minZ||e>s.maxZ||t<s.minX-Ha||t>s.maxX+Ha)continue}else if(t<s.minX||t>s.maxX||e<s.minZ-Ha||e>s.maxZ+Ha)continue;if(n!==s.levelAtLow&&n!==s.levelAtHigh)continue;const a=s.axis==="x"?(t-s.minX)/(s.maxX-s.minX):(e-s.minZ)/(s.maxZ-s.minZ);if(a>=1&&n===s.levelAtLow)return s.levelAtHigh;if(a<=0&&n===s.levelAtHigh)return s.levelAtLow}return n}function uo(n){return Math.max(0,Math.min(255,Math.round(n)))}function $d(n,t){const e=uo(n[0]+(Math.random()-.5)*t),i=uo(n[1]+(Math.random()-.5)*t),s=uo(n[2]+(Math.random()-.5)*t);return`rgb(${e},${i},${s})`}function Kd(n,t){const i=document.createElement("canvas");i.width=320,i.height=320;const s=i.getContext("2d");s.fillStyle=n,s.fillRect(0,0,320,320);for(let l=0;l<22;l++){const c=Math.random()*320,h=Math.random()*320,d=14+Math.random()*46,u=Math.random()<.6,f=s.createRadialGradient(c,h,0,c,h,d);f.addColorStop(0,u?"rgba(20,24,20,0.10)":"rgba(255,255,255,0.06)"),f.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=f,s.beginPath(),s.arc(c,h,d,0,Math.PI*2),s.fill()}const a=320*.32,r=s.createLinearGradient(0,320-a,0,320);r.addColorStop(0,"rgba(0,0,0,0)"),r.addColorStop(.25,t),r.addColorStop(1,t),s.fillStyle=r,s.fillRect(0,320-a,320,a),s.strokeStyle="rgba(10,12,10,0.35)",s.lineWidth=2,s.beginPath(),s.moveTo(0,320-a),s.lineTo(320,320-a),s.stroke(),s.strokeStyle="rgba(15,18,15,0.28)",s.lineWidth=1;for(let l=0;l<4;l++){let c=Math.random()*320,h=Math.random()*320*.7;s.beginPath(),s.moveTo(c,h);const d=3+Math.floor(Math.random()*3);for(let u=0;u<d;u++)c+=(Math.random()-.5)*40,h+=Math.random()*26,s.lineTo(c,h);s.stroke()}const o=new qe(i);return o.wrapS=Je,o.wrapT=Je,o.repeat.set(2.5,1),o}const xh=.5,Ks=8,_v=[93,106,102];function vv(){const t=48*Ks,e=document.createElement("canvas");e.width=t,e.height=t;const i=e.getContext("2d");for(let a=0;a<Ks;a++)for(let r=0;r<Ks;r++){const o=a*48,l=r*48;i.fillStyle=$d(_v,22),i.fillRect(o,l,48,48);const c=i.createLinearGradient(o,l,o+48,l+48);if(c.addColorStop(0,"rgba(255,255,255,0.05)"),c.addColorStop(.5,"rgba(0,0,0,0)"),c.addColorStop(1,"rgba(0,0,0,0.10)"),i.fillStyle=c,i.fillRect(o,l,48,48),Math.random()<.08){const h=o+48*(.3+Math.random()*.4),d=l+48*(.3+Math.random()*.4),u=48*(.12+Math.random()*.16),f=i.createRadialGradient(h,d,0,h,d,u);f.addColorStop(0,"rgba(15,18,16,0.28)"),f.addColorStop(1,"rgba(15,18,16,0)"),i.fillStyle=f,i.beginPath(),i.arc(h,d,u,0,Math.PI*2),i.fill()}i.strokeStyle="rgba(18,22,20,0.55)",i.lineWidth=2,i.strokeRect(o+1,l+1,46,46)}const s=new qe(e);return s.wrapS=Je,s.wrapT=Je,s}const Mh=.6,js=6,xv=[142,156,151];function Mv(){const t=56*js,e=document.createElement("canvas");e.width=t,e.height=t;const i=e.getContext("2d");for(let a=0;a<js;a++)for(let r=0;r<js;r++){const o=a*56,l=r*56;i.fillStyle=$d(xv,12),i.fillRect(o,l,56,56),i.fillStyle="rgba(40,46,43,0.5)";const c=10+Math.floor(Math.random()*8);for(let h=0;h<c;h++){const d=o+Math.random()*56,u=l+Math.random()*56;i.beginPath(),i.arc(d,u,.6,0,Math.PI*2),i.fill()}if(i.strokeStyle="rgba(60,68,64,0.4)",i.lineWidth=2,i.strokeRect(o+1,l+1,54,54),Math.random()<.05){const h=o+56*(.3+Math.random()*.4),d=l+56*(.3+Math.random()*.4),u=56*(.35+Math.random()*.25),f=i.createRadialGradient(h,d,0,h,d,u);f.addColorStop(0,"rgba(120,104,68,0.22)"),f.addColorStop(1,"rgba(120,104,68,0)"),i.fillStyle=f,i.beginPath(),i.arc(h,d,u,0,Math.PI*2),i.fill()}}const s=new qe(e);return s.wrapS=Je,s.wrapT=Je,s}function zi(n,t,e){const i=document.createElement("canvas");i.width=t,i.height=t;const s=i.getContext("2d");s.fillStyle=`rgb(${n[0]},${n[1]},${n[2]})`,s.fillRect(0,0,t,t);for(let r=0;r<e;r++){const o=Math.random()*t,l=Math.random()*t,c=t*(.08+Math.random()*.22),h=Math.random()<.55,d=s.createRadialGradient(o,l,0,o,l,c);d.addColorStop(0,h?`rgba(0,0,0,${.05+Math.random()*.07})`:`rgba(255,255,255,${.04+Math.random()*.05})`),d.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=d,s.beginPath(),s.arc(o,l,c,0,Math.PI*2),s.fill()}const a=new qe(i);return a.wrapS=Je,a.wrapT=Je,a}function yv(){const e=document.createElement("canvas");e.width=192,e.height=320;const i=e.getContext("2d");i.fillStyle="#54707f",i.fillRect(0,0,192,320);for(let l=0;l<90;l++){const c=Math.random()*192,h=.03+Math.random()*.05;i.strokeStyle=Math.random()<.5?`rgba(10,16,20,${h})`:`rgba(255,255,255,${h*.7})`,i.lineWidth=.6+Math.random()*1.2,i.beginPath();let d=c;i.moveTo(d,0);for(let u=0;u<=320;u+=20)d+=(Math.random()-.5)*6,i.lineTo(d,u);i.stroke()}i.strokeStyle="rgba(10,16,20,0.25)",i.lineWidth=3,i.strokeRect(192*.12,320*.08,192*.76,320*.36),i.strokeRect(192*.12,320*.52,192*.76,320*.4);const s=192*.78,a=320*.64,r=i.createRadialGradient(s,a,0,s,a,192*.22);r.addColorStop(0,"rgba(8,10,10,0.30)"),r.addColorStop(1,"rgba(8,10,10,0)"),i.fillStyle=r,i.beginPath(),i.arc(s,a,192*.22,0,Math.PI*2),i.fill();const o=new qe(e);return o.wrapS=Je,o.wrapT=Je,o}const Sv=Kd("#b9c9c4","#7c8d87"),wv=Kd("#a7b8b2","#6c7d78"),jd=vv(),Jd=Mv(),bv=zi([143,165,181],128,26),Ev=zi([125,143,137],128,26),Tv=zi([29,43,39],96,18),Av=zi([34,51,46],96,18),Cv=zi([64,70,66],96,18),Qd=zi([60,63,69],96,20);Qd.repeat.set(1,4);const Rv=yv(),Pv=zi([46,51,42],96,18),rn={wall:new Pe({map:Sv}),wall2:new Pe({map:wv}),floor:new Pe({map:jd}),ceil:new Pe({map:Jd}),prop:new Pe({map:Ev}),bed:new Pe({map:bv}),door:new Pe({map:Rv}),chain:new Pe({map:Qd}),pill:new Pe({color:16777215,emissive:7856328,emissiveIntensity:.55}),pad:new Pe({map:Tv,emissive:10475723,emissiveIntensity:.35}),dispenser:new Pe({map:Av,emissive:10475723,emissiveIntensity:.6}),plate:new Pe({map:Cv,emissive:9083506,emissiveIntensity:.25}),glow:new Qe({color:16773849}),phosphor:new Qe({color:12582857,transparent:!0}),breaker:new Pe({map:Pv,emissive:13597486,emissiveIntensity:.25})};function Lv(n){const[t,e,i]=n,s=Math.min(t,i),a=Math.max(t,i);return s<=.08&&e>=2?"door":s>=.08&&s<=.15&&e>=.6&&e<=1.1&&a>=.9&&a<=1.5?"tv":"strip"}const cr=new Lt(16773849),tu=new Qe({color:cr.clone()}),eu=new Qe({color:cr.clone()}),hr=48,wr=document.createElement("canvas");wr.width=hr;wr.height=hr;const yh=wr.getContext("2d"),nu=new qe(wr),Iv=new Qe({map:nu});function iu(){const n=yh.createImageData(hr,hr);for(let t=0;t<n.data.length;t+=4){const i=Math.random()<.05?255:Math.floor(90+Math.random()*130);n.data[t]=i,n.data[t+1]=i,n.data[t+2]=i,n.data[t+3]=255}yh.putImageData(n,0,0),nu.needsUpdate=!0}iu();function Dv(n){return n==="door"?tu:n==="tv"?Iv:eu}const ua=new Pe({color:792855,emissive:10353636,emissiveIntensity:.55}),Uv=new Pe({color:1449243}),Nv=.55,Ov=.4,Qo=new Pe({color:5884339,emissive:5884339,emissiveIntensity:.5}),Sh=new Pe({color:15328470});function Zl(n,t,e){for(let s=0;s<5;s++){const a=Math.floor(Math.random()*4);let r,o;a===0?(r=Math.random()*t,o=Math.random()*e*.18):a===1?(r=Math.random()*t,o=e-Math.random()*e*.18):a===2?(r=Math.random()*t*.15,o=Math.random()*e):(r=t-Math.random()*t*.15,o=Math.random()*e);const l=10+Math.random()*26,c=n.createRadialGradient(r,o,0,r,o,l);c.addColorStop(0,"rgba(30,26,18,0.22)"),c.addColorStop(1,"rgba(30,26,18,0)"),n.fillStyle=c,n.beginPath(),n.arc(r,o,l,0,Math.PI*2),n.fill()}}function wh(n){const t=document.createElement("canvas");t.width=512,t.height=256;const e=t.getContext("2d");e.fillStyle=n.ink==="phosphor"?"#bfffc9":"#c1170f",e.textAlign="center",e.textBaseline="middle";const i=n.text.split(`
`),s=n.big?110:54,a=n.big?120/110:64/54;e.font=`${s}px 'Comic Sans MS', cursive, sans-serif`;let r=0;for(const _ of i){const m=e.measureText(_).width;m>r&&(r=m)}const o=t.width*.92,l=t.height*.92,c=(i.length-1)*(s*a)+s,h=r>o?o/r:1,d=c>l?l/c:1,u=Math.min(1,h,d),f=s*u,g=f*a;return e.font=`${f}px 'Comic Sans MS', cursive, sans-serif`,e.save(),e.translate(256,128),e.rotate(-.05),i.forEach((_,m)=>{e.fillText(_,0,(m-(i.length-1)/2)*g)}),e.restore(),new qe(t)}function Fv(){const n=document.createElement("canvas");n.width=512,n.height=192;const t=n.getContext("2d");t.fillStyle="#dfe8e4",t.fillRect(0,0,n.width,n.height),t.strokeStyle="#8a9a95",t.lineWidth=6,t.strokeRect(4,4,n.width-8,n.height-8),t.strokeStyle="#2f6e5f",t.lineWidth=12,t.lineCap="round";const e=76,i=n.height/2;t.beginPath(),t.moveTo(e-24,i),t.lineTo(e+24,i),t.moveTo(e,i-24),t.lineTo(e,i+24),t.stroke(),t.fillStyle="#22332e",t.font="700 44px Arial, Helvetica, sans-serif",t.textAlign="left",t.textBaseline="middle";let s=128;for(const a of"MEDICATION")t.fillText(a,s,i),s+=t.measureText(a).width+8;return Zl(t,n.width,n.height),new qe(n)}function zv(n,t){const e=new de,[i,s,a]=n.size,r=fa(n,t),o=r.axis==="x"?i:a,l=r.axis==="x"?a:i,c=o/2,h=br(r),d=new xt(new ae(i,s,a),rn.dispenser);e.add(d);const u=r.axis==="x"?[o*.3,s*.16,l*.5]:[l*.5,s*.16,o*.3],f=new xt(new ae(...u),ua),g=mn(r,o*.4);f.position.set(g[0],-s*.22,g[2]),e.add(f);const _=r.axis==="x"?[o*.55,s*.05,l*.62]:[l*.62,s*.05,o*.55],m=new xt(new ae(..._),Uv),p=mn(r,c+o*.12);m.position.set(p[0],-s*.4,p[2]),e.add(m);const S=new Qe({map:Fv()}),y=new xt(new pn(l*.86,s*.32),S),b=mn(r,c+.005);return y.position.set(b[0],s*.28,b[2]),y.rotation.y=h,y.userData.ownsMaterial=!0,e.add(y),e}function kv(n,t){const[e,,i]=n.size;if(e<i){const a=(t.minX+t.maxX)/2;return{axis:"x",sign:n.pos[0]>a?-1:1}}const s=(t.minZ+t.maxZ)/2;return{axis:"z",sign:n.pos[2]>s?-1:1}}function Bv(n){switch(n){case"px":return{axis:"x",sign:1};case"nx":return{axis:"x",sign:-1};case"pz":return{axis:"z",sign:1};case"nz":return{axis:"z",sign:-1}}}function fa(n,t){return n.facing?Bv(n.facing):kv(n,t)}function mn(n,t){return n.axis==="x"?[n.sign*t,0,0]:[0,0,n.sign*t]}function br(n){return n.axis==="z"?n.sign>0?0:Math.PI:n.sign>0?Math.PI/2:-Math.PI/2}function Hv(){const n=document.createElement("canvas");n.width=512,n.height=176;const t=n.getContext("2d");return t.fillStyle="#152420",t.fillRect(0,0,n.width,n.height),t.strokeStyle="#6f8f86",t.lineWidth=5,t.strokeRect(4,4,n.width-8,n.height-8),t.fillStyle="#bfe9de",t.font="700 50px Arial, Helvetica, sans-serif",t.textAlign="center",t.textBaseline="middle",t.fillText("STAFF ACCESS",n.width/2,66),t.fillStyle="#7fa89c",t.font="400 30px Arial, Helvetica, sans-serif",t.fillText("WING B",n.width/2,126),Zl(t,n.width,n.height),new qe(n)}function Gv(){const n=document.createElement("canvas");n.width=300,n.height=400;const t=n.getContext("2d");t.fillStyle="#0e1a17",t.fillRect(0,0,n.width,n.height);const e=["1","2","3","4","5","6","7","8","9","*","0","#"],i=3,s=n.width/i,a=n.height/(e.length/i);return t.font="600 40px Arial, Helvetica, sans-serif",t.textAlign="center",t.textBaseline="middle",e.forEach((r,o)=>{const l=o%i,c=Math.floor(o/i),h=l*s,d=c*a,u=12;t.fillStyle="#1c2f2a",t.fillRect(h+u,d+u,s-u*2,a-u*2),t.strokeStyle="#4c6b62",t.lineWidth=2,t.strokeRect(h+u,d+u,s-u*2,a-u*2),t.fillStyle="#9fd8cb",t.fillText(r,h+s/2,d+a/2)}),new qe(n)}function Xv(n,t){const e=new de,[i,s,a]=n.size,r=fa(n,t),o=(r.axis==="x"?i:a)/2,l=br(r),c=r.axis==="x"?a:i,h=new xt(new ae(i,s,a),rn.pad);e.add(h);const d=new Qe({map:Hv()}),u=new xt(new pn(c*.86,s*.22),d),f=mn(r,o+.004);u.position.set(f[0],s*.3,f[2]),u.rotation.y=l,u.userData.ownsMaterial=!0,e.add(u);const g=new Qe({map:Gv()}),_=new xt(new pn(c*.6,s*.5),g),m=mn(r,o+.004);_.position.set(m[0],-s*.12,m[2]),_.rotation.y=l,_.userData.ownsMaterial=!0,e.add(_);const p=r.axis==="x"?[.012,s*.04,c*.62]:[c*.62,s*.04,.012],S=new xt(new ae(...p),ua),y=mn(r,o+.01);return S.position.set(y[0],s*.14,y[2]),e.add(S),e}function Vv(n,t){const e=new de,[i,s,a]=n.size,r=fa(n,t),o=(r.axis==="x"?i:a)/2,l=r.axis==="x"?a:i,c=new xt(new ae(i,s,a),rn.breaker);e.add(c);const h=r.axis==="x"?[l*.35,s*.09,l*.09]:[l*.09,s*.09,l*.35],d=new xt(new ae(...h),rn.chain),u=mn(r,o+l*.18);d.position.set(u[0],-s*.05,u[2]),e.add(d);const f=new xt(new ae(...r.axis==="x"?[l*.1,s*.1,l*.06]:[l*.06,s*.1,l*.1]),ua),g=mn(r,o+.01);return f.position.set(g[0],s*.28,g[2]),e.add(f),e}function Wv(n){const t=document.createElement("canvas");t.width=512,t.height=144;const e=t.getContext("2d");return e.fillStyle="#e7ece9",e.fillRect(0,0,t.width,t.height),e.strokeStyle="#8a9a95",e.lineWidth=5,e.strokeRect(4,4,t.width-8,t.height-8),e.fillStyle="#2b3a36",e.font="700 48px Arial, Helvetica, sans-serif",e.textAlign="center",e.textBaseline="middle",e.fillText(n,t.width/2,t.height/2),new qe(t)}function Zv(n){return n==="staffdoor"?"B-WING · STAFF ONLY":n==="exitdoor"?"EXIT":null}function Yv(n,t){const e=new de,[i,s,a]=n.size,r=fa(n,t),o=(r.axis==="x"?i:a)/2,l=br(r),c=r.axis==="x"?a:i,h=new xt(new ae(i,s,a),rn.door);e.add(h);const d=.02,u=r.axis==="x"?[d,s*.16,c*.86]:[c*.86,s*.16,d],f=new xt(new ae(...u),rn.wall2),g=mn(r,o+d/2);f.position.set(g[0],-s*.38,g[2]),e.add(f);const _=.03,m=r.axis==="x"?[_,.05,c*.3]:[c*.3,.05,_],p=new xt(new ae(...m),rn.chain),S=mn(r,o+_/2+.01),y=c*.22;r.axis==="x"?p.position.set(S[0],0,S[2]+y):p.position.set(S[0]+y,0,S[2]),e.add(p);const b=Zv(n.id);if(b){const C=new Qe({map:Wv(b)}),E=new xt(new pn(c*.7,s*.12),C),T=mn(r,o+.005);E.position.set(T[0],s*.36,T[2]),E.rotation.y=l,E.userData.ownsMaterial=!0,e.add(E)}return e}function su(n,t,e){switch(n.beginPath(),t){case"circle":n.arc(0,0,e*.72,0,Math.PI*2);break;case"square":n.rect(-e*.68,-e*.68,e*1.36,e*1.36);break;case"triangle":n.moveTo(0,-e*.82),n.lineTo(-e*.76,e*.6),n.lineTo(e*.76,e*.6),n.closePath();break}}function qv(n,t,e){const i=new $s({color:t,emissive:new Lt(t),emissiveIntensity:.45,roughness:.4}),s=e*.22;let a;switch(n){case"circle":a=new vs(e*.5,e*.5,s,22);break;case"square":a=new ae(e*.86,s,e*.86);break;case"triangle":a=new vs(e*.58,e*.58,s,3);break}const r=new xt(a,i);return r.userData.ownsMaterial=!0,r}function $v(n){const t=new de,[e,i]=n.size,s=i*.45,a=new xt(new ae(e*.55,s,e*.55),rn.prop);a.position.y=-i/2+s/2,t.add(a);const r=e*.75,o=qv(n.shape??"circle",n.color??"#ffffff",r);return o.position.y=-i/2+s+r*.28,t.add(o),t}function Kv(){const n=document.createElement("canvas");n.width=320,n.height=300;const t=n.getContext("2d");t.fillStyle="#152420",t.fillRect(0,0,n.width,n.height),t.strokeStyle="#6f8f86",t.lineWidth=4,t.strokeRect(3,3,n.width-6,n.height-6);const e=["circle","square","triangle"],i=n.width/e.length;return t.strokeStyle="#bfe9de",t.lineWidth=6,e.forEach((s,a)=>{t.save(),t.translate(i*a+i/2,n.height/2),su(t,s,46),t.stroke(),t.restore()}),Zl(t,n.width,n.height),new qe(n)}function jv(n,t){const e=new de,[i,s,a]=n.size,r=fa(n,t),o=(r.axis==="x"?i:a)/2,l=br(r),c=r.axis==="x"?a:i,h=new xt(new ae(i,s,a),rn.pad);e.add(h);const d=new Qe({map:Kv()}),u=new xt(new pn(c*.9,s*.82),d),f=mn(r,o+.004);u.position.set(f[0],0,f[2]),u.rotation.y=l,u.userData.ownsMaterial=!0,e.add(u);const g=r.axis==="x"?[.012,s*.04,c*.62]:[c*.62,s*.04,.012],_=new xt(new ae(...g),ua),m=mn(r,o+.01);return _.position.set(m[0],s*.34,m[2]),e.add(_),e}function bh(n,t){const e=document.createElement("canvas"),i=170;e.width=i*Math.max(1,n.length),e.height=170;const s=e.getContext("2d");return s.clearRect(0,0,e.width,e.height),n.forEach((a,r)=>{const o=t[r]??!1;s.save(),s.translate(i*r+i/2,e.height/2),s.lineWidth=7,o?(s.strokeStyle=a.color,s.fillStyle=a.color,s.shadowColor=a.color,s.shadowBlur=26):(s.strokeStyle="rgba(255,255,255,0.22)",s.fillStyle="transparent"),su(s,a.shape,46),o&&s.fill(),s.shadowBlur=0,s.stroke(),s.restore()}),new qe(e)}function au(n,t=Math.PI/2.3,e=.25){const i=new de,s=n*.32,a=Math.max(n-s*2,s*.6),r=new xt(new vs(s,s,a,10),rn.pill);i.add(r);const o=new xt(new lr(s,10,8,0,Math.PI*2,0,Math.PI/2),Qo);o.position.y=a/2,i.add(o);const l=new xt(new lr(s,10,8,0,Math.PI*2,Math.PI/2,Math.PI/2),Qo);return l.position.y=-a/2,i.add(l),i.rotation.set(e,0,t),i}function Jv(n){const t=new de;return t.add(au(Math.max(...n.size))),t}function Qv(n){const t=new de,[e,i,s]=n.size,a=Math.max(e,s),r=a*.55,o=a*.38,l=new xt(new vs(r,o,i,12,1,!0),Sh);t.add(l);const c=new xt(new Vl(o,12),Sh);c.rotation.x=-Math.PI/2,c.position.y=-i/2+.001,t.add(c);const h=au(a*.55,Math.PI/2.6,.15);return h.position.set(a*.08,i*.1,-a*.05),t.add(h),t}function Eh(n){n.traverse(t=>{var e;if(t instanceof xt&&(t.geometry.dispose(),t.userData.ownsMaterial)){const i=t.material;(e=i.map)==null||e.dispose(),i.dispose()}})}const xr=class xr{constructor(t){this.colliders=[],this.levels=[],this.stairwells=[],this.ceilingY=3,this.dark=!1,this.lightGated=[],this.phosphorGlow=1,this.phosphorBlockMats=[],this.root=new de,this.groups={both:new de,lucid:new de,unmed:new de},this.interactables=new Map,this.animated=[],this.scrawlMats=[],this.scrawlEntries=new Map,this.iconPanelEntries=new Map,this.tvStaticTimer=0,this.stripFlickerLeft=0,this.lastT=0,this.focusedId=null,this.focusHighlights=[],t.add(this.root),this.root.add(this.groups.both,this.groups.lucid,this.groups.unmed)}loadRoom(t){this.clear(),this.room=t,this.colliders=t.colliders.slice(),this.levels=t.levels??[{id:mv,baseY:0,floor:t.floor,heightZones:t.heightZones??[],ramps:t.ramps??[]}],this.stairwells=t.stairwells??[],this.ceilingY=t.ceilingY??3;const e=t.floor.maxX-t.floor.minX,i=t.floor.maxZ-t.floor.minZ,s=(t.floor.minX+t.floor.maxX)/2,a=(t.floor.minZ+t.floor.maxZ)/2,r=jd.clone();r.repeat.set(e/(xh*Ks),i/(xh*Ks));const o=new Pe({map:r}),l=new xt(new pn(e,i),o);l.rotation.x=-Math.PI/2,l.position.set(s,0,a),l.userData.ownsMaterial=!0;const c=Jd.clone();c.repeat.set(e/(Mh*js),i/(Mh*js));const h=new Pe({map:c}),d=new xt(new pn(e,i),h);d.rotation.x=Math.PI/2,d.position.set(s,this.ceilingY,a),d.userData.ownsMaterial=!0,this.groups.both.add(l,d),this.phosphorGlow=1,this.phosphorBlockMats=[];let u=null;for(const f of t.blocks){let g;f.mat==="glow"?g=Dv(Lv(f.size)):f.mat==="phosphor"?(u||(u=rn.phosphor.clone(),this.phosphorBlockMats.push(u)),g=u):g=rn[f.mat];const _=new xt(new ae(...f.size),g);_.position.set(...f.pos),f.rotY&&(_.rotation.y=f.rotY),this.groups[f.states??"both"].add(_),f.lightState&&f.lightState!=="both"&&this.lightGated.push({mesh:_,light:f.lightState})}for(const f of t.scrawls){const g=new Qe({map:wh(f),transparent:!0}),_=new xt(new pn(f.size,f.size/2),g);_.position.set(...f.pos),_.rotation.y=f.rotY,_.userData.ownsMaterial=!0,this.groups.unmed.add(_),this.scrawlMats.push({mat:g,phase:Math.random()*Math.PI*2,phosphor:f.ink==="phosphor"}),f.id&&this.scrawlEntries.set(f.id,{mat:g,def:f}),f.lightState&&f.lightState!=="both"&&this.lightGated.push({mesh:_,light:f.lightState})}for(const f of t.interactables){let g;switch(f.type){case"dispenser":g=zv(f,t.floor);break;case"keypad":g=Xv(f,t.floor);break;case"door":g=Yv(f,t.floor);break;case"switch":g=Vv(f,t.floor);break;case"pill_pickup":g=Jv(f);break;case"pill_cup":g=Qv(f);break;case"shape_key":g=$v(f);break;case"shape_lock":g=jv(f,t.floor);break;default:g=new xt(new ae(...f.size),rn[f.mat])}g.position.set(...f.pos),this.groups[f.states??"both"].add(g),this.interactables.set(f.id,{def:f,mesh:g}),(f.type==="pill_cup"||f.type==="pill_pickup"||f.type==="shape_key")&&this.animated.push({mesh:g,baseY:f.pos[1]}),f.lightState&&f.lightState!=="both"&&this.lightGated.push({mesh:g,light:f.lightState})}for(const f of t.iconPanels??[]){const g=f.shapes.map(()=>!1),_=f.size??2.4,m=new Qe({map:bh(f.shapes,g),transparent:!0}),p=new xt(new pn(_,_/Math.max(1,f.shapes.length)),m);p.position.set(...f.pos),p.rotation.y=f.rotY,p.userData.ownsMaterial=!0,this.groups.both.add(p),this.iconPanelEntries.set(f.id,{mat:m,def:f,lit:g})}this.applyLight(t.startDark??!1)}applyState(t){this.groups.lucid.visible=t==="lucid",this.groups.unmed.visible=t==="unmed"}applyLight(t){this.dark=t;for(const e of this.lightGated)e.mesh.visible=e.light==="dark"===t}isDark(){return this.dark}setGlowFade(t){this.phosphorGlow=Math.max(0,Math.min(1,t))}floorHeightAt(t,e,i){for(const a of this.stairwells){if(e<a.minX||e>a.maxX||i<a.minZ||i>a.maxZ||t!==a.levelAtLow&&t!==a.levelAtHigh)continue;const r=a.axis==="x"?(e-a.minX)/(a.maxX-a.minX):(i-a.minZ)/(a.maxZ-a.minZ);return a.yLow+(a.yHigh-a.yLow)*r}const s=this.levels.find(a=>a.id===t)??this.levels[0];for(const a of s.ramps??[])if(e>=a.minX&&e<=a.maxX&&i>=a.minZ&&i<=a.maxZ){const r=a.axis==="x"?(e-a.minX)/(a.maxX-a.minX):(i-a.minZ)/(a.maxZ-a.minZ);return a.yLow+(a.yHigh-a.yLow)*r}for(const a of s.heightZones??[])if(e>=a.minX&&e<=a.maxX&&i>=a.minZ&&i<=a.maxZ)return a.y;return s.baseY}updateScrawlText(t,e){const i=this.scrawlEntries.get(t);if(!i)return;const s=i.mat.map;i.def.text=e,i.mat.map=wh(i.def),i.mat.needsUpdate=!0,s==null||s.dispose()}updateIconPanel(t,e){const i=this.iconPanelEntries.get(t);if(!i)return;const s=i.mat.map;i.lit=e,i.mat.map=bh(i.def.shapes,e),i.mat.needsUpdate=!0,s==null||s.dispose()}entries(){return[...this.interactables.values()]}removeInteractable(t){var s;const e=this.interactables.get(t);if(!e)return;this.focusedId===t&&this.setFocused(null),(s=e.mesh.parent)==null||s.remove(e.mesh),Eh(e.mesh),this.interactables.delete(t);const i=this.animated.findIndex(a=>a.mesh===e.mesh);i>=0&&this.animated.splice(i,1)}setFocused(t){t!==this.focusedId&&(this.clearFocusHighlight(),this.focusedId=t,t&&this.applyFocusHighlight(t))}applyFocusHighlight(t){const e=this.interactables.get(t);e&&e.mesh.traverse(i=>{if(!(i instanceof xt))return;const s=i.material;if(s.emissiveIntensity===void 0)return;const a=s.clone();(!a.emissive||a.emissive.getHex()===0)&&(a.emissive=new Lt(16773849)),this.focusHighlights.push({mesh:i,base:s,clone:a}),i.material=a})}clearFocusHighlight(){for(const t of this.focusHighlights)t.mesh.material=t.base,t.clone.dispose();this.focusHighlights.length=0}update(t){const e=this.lastT===0?0:Math.max(0,t-this.lastT);this.lastT=t;for(const r of this.animated)r.mesh.rotation.y=t,r.mesh.position.y=r.baseY+Math.sin(t*2)*.03;ua.emissiveIntensity=Nv+Math.sin(t*2.2)*Ov;const i=.15*Math.sin(t*2);Qo.emissiveIntensity=.5+i,rn.pill.emissiveIntensity=.55+i;const s=1+Math.sin(t*1.3)*.15;tu.color.copy(cr).multiplyScalar(s),this.stripFlickerLeft>0?this.stripFlickerLeft-=e:Math.random()<.015&&(this.stripFlickerLeft=.04+Math.random()*.06);const a=this.stripFlickerLeft>0?.35:1;eu.color.copy(cr).multiplyScalar(a),this.tvStaticTimer+=e,this.tvStaticTimer>=.12&&(this.tvStaticTimer=0,iu());for(const r of this.scrawlMats){const o=.82+Math.sin(t*1.6+r.phase)*.16;r.mat.opacity=r.phosphor?o*this.phosphorGlow:o}for(const r of this.phosphorBlockMats)r.opacity=this.phosphorGlow;for(const r of this.focusHighlights)r.base.emissiveIntensity!==void 0&&(r.clone.emissiveIntensity=r.base.emissiveIntensity+xr.FOCUS_EMISSIVE_BUMP),r.base.emissive&&r.clone.emissive&&r.clone.emissive.copy(r.base.emissive)}clear(){this.setFocused(null);for(const t of Object.values(this.groups))for(const e of[...t.children])t.remove(e),Eh(e);this.interactables.clear(),this.animated.length=0,this.scrawlMats.length=0,this.scrawlEntries.clear(),this.iconPanelEntries.clear(),this.colliders=[],this.lightGated=[],this.dark=!1;for(const t of this.phosphorBlockMats)t.dispose();this.phosphorBlockMats=[],this.phosphorGlow=1}};xr.FOCUS_EMISSIVE_BUMP=.35;let tl=xr;class tx{constructor(t){this.world=t,this.focusedId=null,this.ray=new rv}update(t,e,i,s){this.focusedId=null,this.ray.setFromCamera(new Ht(0,0),t);let a=null,r=Bt.interact.maxDistance;for(const{def:o,mesh:l}of this.world.entries()){const c=o.states??"both";if(c!=="both"&&c!==e)continue;const h=o.lightState??"both";if(h!=="both"&&h!==(this.world.isDark()?"dark":"lit")||i.isAvailable&&!i.isAvailable(o.id,s))continue;const d=this.ray.intersectObject(l,!0);d.length&&d[0].distance<r&&(r=d[0].distance,a=o.label,this.focusedId=o.id)}return a}interact(t,e){if(!this.focusedId)return;const i=this.focusedId;if(t.onInteract&&t.onInteract(i,e))return;const s=this.world.entries().find(c=>c.def.id===i);if(!s)return;const{state:a,hud:r,audio:o,telemetry:l}=e;switch(s.def.type){case"dispenser":{if(a.pills>=a.maxPills){l.event("dispenser_refused",{reason:"full",pills:a.pills,maxPills:a.maxPills}),r.toast("the dispenser hums. you are already holding all it will give.");break}const c=a.pills,h=a.refill(),d=h-c;o.dispenserClunk(),l.event("dispenser_used",{reason:"refill",gained:d,pills:h}),r.setPills(h,a.maxPills,a.canShift),r.pillPopup(`+${d} pill${d===1?"":"s"}`),r.toast("a single pill rattles into your palm.");break}case"pill_pickup":{a.pills=Math.min(a.maxPills,a.pills+1),this.world.removeInteractable(i),l.event("pill_pickup"),r.setPills(a.pills,a.maxPills,a.canShift),r.pillPopup("+1 pill"),r.toast("a pill. pocketed.");break}}}}const Th=[{id:"room1-tutorial-explicitness",active:!1,arms:[{id:"control",weight:1},{id:"explicit",weight:1}]}];function ex(){try{return new URLSearchParams(location.search)}catch{return new URLSearchParams}}function nx(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return t>>>0}function ix(n,t){var s;const e=n.reduce((a,r)=>a+r.weight,0);if(e<=0)return((s=n[0])==null?void 0:s.id)??"";let i=t*e;for(const a of n)if(i-=a.weight,i<0)return a.id;return n[n.length-1].id}function sx(n){const t=n.get("experiment");if(t){const i=Th.find(s=>s.id===t);if(i)return i}const e=Th.filter(i=>i.active);return e.length>1&&console.warn(`[experiments] ${e.length} experiments marked active (want exactly one, §6.3) — using "${e[0].id}".`),e[0]}function ax(n){const t=ex(),e=sx(t);if(!e)return null;const i=t.get("variant");if(i&&e.arms.some(a=>a.id===i))return{experiment:e.id,variant:i};const s=nx(`${n}:${e.id}`)/4294967296;return{experiment:e.id,variant:ix(e.arms,s)}}const Ah="wardb-player-v1",Ch="wardb-run-v1",Ga="wardb-telemetry-retry-v1",rx="wardb-notrack",ox=500,lx=50,Rh=100*1024,cx=1e3,Xa=300;function Ei(n){return Math.round(n*100)/100}function Va(){return typeof performance<"u"&&typeof performance.now=="function"?performance.now():Date.now()}function ru(){return typeof crypto<"u"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():`id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}function aa(n){try{return localStorage.getItem(n)}catch{return null}}function Yl(n,t){try{localStorage.setItem(n,t)}catch{}}function hx(n){try{localStorage.removeItem(n)}catch{}}function dx(){const n=aa(Ah);if(n)return n;const t=ru();return Yl(Ah,t),t}function ux(){const n=aa(Ch),t=n?parseInt(n,10):0,e=(Number.isFinite(t)?t:0)+1;return Yl(Ch,String(e)),e}function fx(n){return n==="localhost"||n==="127.0.0.1"?"local":n.endsWith(".github.io")?"pages":n.endsWith(".ts.net")?"tailnet":n==="itch.io"||n.endsWith(".itch.io")||n.endsWith(".itch.zone")||n.endsWith(".hwcdn.net")?"itch":"unknown"}function Ph(){try{return location.hostname}catch{return""}}function px(){try{if(new URLSearchParams(location.search).get("notrack")==="1")return!0}catch{}const n=aa(rx);return n==="1"||n==="true"}function Wa(n,t){return n?n.length>t?n.slice(0,t):n:""}function Lh(n){if(!n)return"";const t=n.indexOf(`
`);return t===-1?n:n.slice(0,t)}class mx{constructor(t,e){this.sessionId=ru(),this.queue=[],this.droppedCount=0,this.quitFired=!1,this.unloading=!1,this.pageLoadCalled=!1,this.started=!1,this.idle=!1,this.lastActivityTs=0,this.idleSinceTs=0,this.activeAccumMs=0,this.activeSinceTs=0,this.perfSamples=[],this.perfLastFrameTs=0,this.perfWindowStart=0,this.perfTick=i=>{if(this.perfLastFrameTs>0){const s=i-this.perfLastFrameTs;s>0&&this.perfSamples.push(1e3/s)}this.perfLastFrameTs=i,i-this.perfWindowStart>=Bt.telemetry.perfIntervalMs&&(this.emitPerf(),this.perfWindowStart=i),requestAnimationFrame(this.perfTick)},this.getSnapshot=t,this.debug=(e==null?void 0:e.debug)??!1,this.disabled=px(),this.env=fx(Ph()),this.disabled?(this.playerId="",this.runIndex=0,this.assignment=null):(this.playerId=dx(),this.runIndex=ux(),this.assignment=ax(this.playerId))}get activeMs(){return this.disabled||!this.started?0:this.idle?this.activeAccumMs:this.activeAccumMs+(Va()-this.activeSinceTs)}event(t,e){if(this.disabled)return;const i=this.getSnapshot(),s={name:t,t:Date.now(),room:i.room,x:Ei(i.x),z:Ei(i.z),yaw:Ei(i.yaw),level:i.level,pills:i.pills,state:i.state,med:Ei(i.medication),...e};this.queue.push(s),this.queue.length>ox&&(this.queue.shift(),this.droppedCount++),this.queue.length>=lx&&this.flush()}flush(t=!1){if(this.disabled||this.queue.length===0&&this.droppedCount===0)return;const e=this.queue;this.queue=[];const i=this.droppedCount;this.droppedCount=0;const s={version:_h,session:this.sessionId,player:this.playerId,run:this.runIndex,env:this.env,debug:this.debug,events:e};i>0&&(s.dropped=i),this.assignment&&(s.experiment=this.assignment.experiment,s.variant=this.assignment.variant);{console.log("[telemetry]",s);return}}pageLoad(){this.disabled||this.pageLoadCalled||(this.pageLoadCalled=!0,this.installUnloadHandlers(),this.installErrorHandlers(),this.resendRetryBuffer(),this.event("page_load",this.sessionContext()))}start(){if(this.disabled||this.started)return;this.started=!0,this.event("session_start",{version:_h,...this.sessionContext()});const t=Va();this.activeSinceTs=t,this.lastActivityTs=t,this.installIdleTracking(),setInterval(()=>this.event("pos"),Bt.telemetry.positionSampleMs),setInterval(()=>this.flush(),Bt.telemetry.flushMs),this.perfWindowStart=t,this.perfLastFrameTs=0,requestAnimationFrame(this.perfTick)}sessionContext(){const t=typeof matchMedia=="function"&&matchMedia("(pointer:coarse)").matches;let e=!1;try{e=window.self!==window.top}catch{e=!0}return{ua:navigator.userAgent,screen:`${innerWidth}x${innerHeight}`,touch:t,referrer:document.referrer||"",hostname:Ph(),iframe:e,dpr:window.devicePixelRatio||1,lang:navigator.language,cores:navigator.hardwareConcurrency||0}}installUnloadHandlers(){addEventListener("pagehide",()=>{this.unloading=!0,this.quitFired||(this.quitFired=!0,this.event("quit")),this.flush(!0)}),document.addEventListener("visibilitychange",()=>{document.visibilityState==="hidden"&&this.flush(!0)})}installErrorHandlers(){window.addEventListener("error",t=>{const e=t.error;this.event("error",{kind:"error",msg:Wa(t.message||String(t.error),Xa),stack:Wa(Lh(e==null?void 0:e.stack),Xa)})}),window.addEventListener("unhandledrejection",t=>{const e=t.reason,i=e instanceof Error?e.message:String(e),s=e instanceof Error?e.stack:void 0;this.event("error",{kind:"unhandledrejection",msg:Wa(i,Xa),stack:Wa(Lh(s),Xa)})}),window.addEventListener("webglcontextlost",()=>{this.unloading||this.event("error",{kind:"webglcontextlost",msg:"WebGL context lost"})},!0)}installIdleTracking(){const t=()=>this.handleActivity();["keydown","pointerdown","mousemove","touchstart"].forEach(e=>{window.addEventListener(e,t,{passive:!0})}),setInterval(()=>this.checkIdle(),cx)}handleActivity(){const t=Va();if(this.lastActivityTs=t,this.idle){this.idle=!1,this.activeSinceTs=t;const e=(t-this.idleSinceTs)/1e3;this.event("idle_end",{idle_s:Ei(e)})}}checkIdle(){if(this.idle)return;Va()-this.lastActivityTs>=Bt.telemetry.idleThresholdMs&&(this.activeAccumMs+=this.lastActivityTs-this.activeSinceTs,this.idle=!0,this.idleSinceTs=this.lastActivityTs,this.event("idle_start"))}emitPerf(){if(this.perfSamples.length===0)return;const t=[...this.perfSamples].sort((a,r)=>a-r),e=t.length,i=t[Math.floor(e*.5)],s=t[Math.floor(e*.1)];this.event("perf",{fps_p50:Ei(i),fps_p10:Ei(s),frames:e}),this.perfSamples=[]}saveRetryBuffer(t){try{let e=Array.isArray(t.events)?[...t.events]:[];const i=aa(Ga);if(i)try{const r=JSON.parse(i);Array.isArray(r==null?void 0:r.events)&&(e=[...r.events,...e])}catch{}let s={...t,events:e},a=JSON.stringify(s);for(;a.length>Rh&&e.length>1;)e=e.slice(1),s={...s,events:e},a=JSON.stringify(s);a.length<=Rh&&Yl(Ga,a)}catch{}}resendRetryBuffer(){aa(Ga)&&hx(Ga)}}const ou="wardb-settings-v1",fo={randomizeCodes:!1};function gx(){try{const n=localStorage.getItem(ou);return n?{...fo,...JSON.parse(n)}:{...fo}}catch{return{...fo}}}function _x(){try{localStorage.setItem(ou,JSON.stringify(ql))}catch{}}let ql=gx();function yn(){return ql.randomizeCodes}function vx(n){ql.randomizeCodes=n,_x()}class xx{constructor(){this.toastTimer=null,this.prevPillCount=-1,this.prevMax=-1,this.threatLevelCur=0,this.threatPulseOn=!1,this.threatLineOn=!1,this.medVisible=!1,this.medWarnOn=!1,this.stateChip=this.byId("stateChip"),this.roomLabel=this.byId("roomLabel"),this.objective=this.byId("objective"),this.prompt=this.byId("prompt"),this.toastEl=this.byId("toast"),this.pills=this.byId("pills"),this.pillPopupEl=this.byId("pillPopup"),this.medMeter=this.byId("medMeter"),this.medMeterFill=this.byId("medMeterFill"),this.vignette=this.byId("vignette"),this.shiftFx=this.byId("shiftFx"),this.threatVignette=this.byId("threatVignette"),this.threatEdgeL=this.byId("threatEdgeL"),this.threatEdgeR=this.byId("threatEdgeR"),this.threatLine=this.byId("threatLine"),this.startOverlay=this.byId("startOverlay"),this.startBtn=this.byId("startBtn"),this.configBtn=this.byId("configBtn"),this.settingsOverlay=this.byId("settingsOverlay"),this.settingsBackBtn=this.byId("settingsBackBtn"),this.randomizeCodesToggle=this.byId("randomizeCodesToggle"),this.genericOverlay=this.byId("genericOverlay"),this.ovTitle=this.byId("ovTitle"),this.ovSub=this.byId("ovSub"),this.ovCard=this.byId("ovCard"),this.ovBtn=this.byId("ovBtn")}byId(t){const e=document.getElementById(t);if(!e)throw new Error(`Hud: missing #${t} element`);return e}setState(t){const e=t==="unmed";this.stateChip.textContent=e?"UNMEDICATED":"LUCID",this.stateChip.classList.toggle("unmed",e),this.vignette.classList.toggle("on",e)}setObjective(t){this.objective.textContent=t}setRoomLabel(t){this.roomLabel.textContent=t}setPrompt(t){if(t===null){this.prompt.style.display="none";return}this.prompt.textContent=t,this.prompt.style.display="block"}toast(t,e=3200){this.toastEl.textContent=t,this.toastEl.style.opacity="1",this.toastTimer!==null&&clearTimeout(this.toastTimer),this.toastTimer=setTimeout(()=>{this.toastEl.style.opacity="0"},e)}setPills(t,e,i){if(this.pills.style.display=i?"flex":"none",!i){this.prevPillCount=-1,this.prevMax=-1;return}const s=this.prevMax!==-1&&e>this.prevMax?this.prevMax:-1,a=Math.max(0,Math.min(e,t));let r="";for(let l=0;l<e;l++){const c=`pillDot${l<a?" filled":""}${l>=s&&s!==-1?" new":""}`;r+=`<span class="${c}"></span>`}const o=a>=e?'<span class="pillsFullTag">full</span>':"";this.pills.innerHTML=`<span class="pillsLabel">pills</span><span class="pillsDots">${r}</span>${o}`,this.prevPillCount!==-1&&t!==this.prevPillCount&&this.pillsFlash(),this.prevPillCount=t,this.prevMax=e,s!==-1&&this.popNewPillSlots()}pillsFlash(){this.pills.classList.remove("flash"),this.pills.offsetWidth,this.pills.classList.add("flash")}popNewPillSlots(){this.pillsFlash(),this.pills.querySelectorAll(".pillDot.new").forEach((e,i)=>{e.style.transition="none",e.style.transform="scale(0.15)",e.style.opacity="0.15",e.offsetWidth;const s=i*90;e.style.transition=`transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${s}ms, opacity 0.35s ease-out ${s}ms, box-shadow 0.6s ease-out ${s}ms`,e.style.transform="scale(1.45)",e.style.opacity="1",e.style.boxShadow="0 0 24px 7px rgba(159, 216, 203, 0.95)",setTimeout(()=>{e.style.transform="scale(1)",e.style.boxShadow="",e.classList.remove("new")},s+620)})}setMedication(t,e,i){if(e!==this.medVisible&&(this.medMeter.style.display=e?"flex":"none",this.medVisible=e),!e){this.medWarnOn&&(this.medMeter.classList.remove("warn"),this.medWarnOn=!1);return}const s=Math.max(0,Math.min(1,t));this.medMeterFill.style.width=`${s*100}%`,i!==this.medWarnOn&&(this.medMeter.classList.toggle("warn",i),this.medWarnOn=i)}pillPopup(t){this.pillPopupEl.textContent=t,this.pillPopupEl.classList.remove("show"),this.pillPopupEl.offsetWidth,this.pillPopupEl.classList.add("show")}setThreat(t,e){if(t<=0&&e===null){this.threatLevelCur=0,this.threatVignette.style.opacity="0",this.threatEdgeL.style.opacity="0",this.threatEdgeR.style.opacity="0",this.threatPulseOn&&(this.threatVignette.classList.remove("pulse"),this.threatPulseOn=!1),this.threatLineOn&&(this.threatLine.classList.remove("show"),this.threatLineOn=!1);return}const i=Math.max(0,Math.min(1,t));this.threatLevelCur+=(i-this.threatLevelCur)*.25,Math.abs(this.threatLevelCur-i)<.002&&(this.threatLevelCur=i);const s=this.threatLevelCur;this.threatVignette.style.opacity=String(s);const a=s>=(this.threatPulseOn?.85:.9);a!==this.threatPulseOn&&(this.threatVignette.classList.toggle("pulse",a),this.threatPulseOn=a);let r=0,o=0;if(e!==null&&s>.35){const c=Math.atan2(Math.sin(e),Math.cos(e)),h=Math.abs(c);if(h>.7){const u=Math.min(1,(h-.7)/(Math.PI-.7))*s;if(h>2.4){const f=Math.min(1,u*.9+.15);r=f,o=f}else c>0?o=u:r=u}}this.threatEdgeL.style.opacity=String(r),this.threatEdgeR.style.opacity=String(o);const l=s>=(this.threatLineOn?.45:.5);l!==this.threatLineOn&&(this.threatLine.classList.toggle("show",l),this.threatLineOn=l)}shiftPulse(){this.shiftFx.classList.remove("pulse"),this.shiftFx.offsetWidth,this.shiftFx.classList.add("pulse")}showStart(t){this.startOverlay.style.display="flex",this.startBtn.onclick=()=>{this.startOverlay.style.display="none",t()}}bindConfig(t,e){this.configBtn.onclick=()=>{this.randomizeCodesToggle.checked=t(),this.startOverlay.style.display="none",this.settingsOverlay.style.display="flex"},this.randomizeCodesToggle.onchange=()=>{e(this.randomizeCodesToggle.checked)},this.settingsBackBtn.onclick=()=>{this.settingsOverlay.style.display="none",this.startOverlay.style.display="flex"}}showEndCard(t,e,i,s,a){this.ovTitle.textContent=t,this.ovSub.textContent=e,this.ovCard.innerHTML=i,this.ovBtn.textContent=s,this.ovBtn.onclick=a,this.genericOverlay.style.display="flex"}hideOverlays(){this.startOverlay.style.display="none",this.settingsOverlay.style.display="none",this.genericOverlay.style.display="none"}}const el=.24,Is=el/2,Ih=3,Dh=1.5;class Re{constructor(){this.blocks=[],this.colliders=[]}block(t,e,i,s,a){this.blocks.push({size:t,pos:e,mat:i,states:s,rotY:a})}wallX(t,e,i,s="wall",a){const r=e-t,o=(t+e)/2;this.block([r,Ih,el],[o,Dh,i],s,a),this.colliders.push({minX:t,maxX:e,minZ:i-Is,maxZ:i+Is,states:a})}wallZ(t,e,i,s="wall2",a){const r=e-t,o=(t+e)/2;this.block([el,Ih,r],[i,Dh,o],s,a),this.colliders.push({minX:i-Is,maxX:i+Is,minZ:t,maxZ:e,states:a})}solid(t,e,i,s,a){this.colliders.push({minX:t,maxX:e,minZ:i,maxZ:s,states:a})}}const Uh="wardb-kp-style";function Mx(){if(document.getElementById(Uh))return;const n=document.createElement("style");n.id=Uh,n.textContent=`
    .wardb-kp-overlay {
      position: fixed; inset: 0; z-index: 40; display: flex;
      align-items: center; justify-content: center;
      background: rgba(3, 5, 5, 0.82);
      font-family: "SF Mono", "Cascadia Mono", Consolas, Menlo, monospace;
      color: #e9f2ef;
    }
    .wardb-kp-pad {
      background: #0d1412; border: 1px solid rgba(159, 216, 203, 0.35);
      border-radius: 3px; padding: 22px 24px; text-align: center;
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
    }
    .wardb-kp-head {
      font-size: 10px; letter-spacing: 0.28em; opacity: 0.7;
      margin-bottom: 14px; text-indent: 0.28em;
    }
    .wardb-kp-display {
      font-size: 26px; letter-spacing: 0.5em; text-indent: 0.5em;
      color: #9fd8cb; height: 38px; margin-bottom: 14px;
      border-bottom: 1px solid rgba(159, 216, 203, 0.25);
    }
    .wardb-kp-grid {
      display: grid; grid-template-columns: repeat(3, 64px); gap: 8px;
    }
    .wardb-kp-key {
      pointer-events: auto; cursor: pointer; height: 52px;
      background: #101b18; border: 1px solid rgba(159, 216, 203, 0.25);
      color: #e9f2ef; font-family: inherit; font-size: 18px; border-radius: 2px;
    }
    .wardb-kp-key:active { background: rgba(159, 216, 203, 0.2); }
    .wardb-kp-key.wardb-kp-exit { color: #ff3b30; border-color: rgba(255, 59, 48, 0.35); }
    .wardb-kp-msg {
      margin-top: 12px; font-size: 10px; letter-spacing: 0.2em; opacity: 0.65; height: 14px;
    }
    .wardb-kp-msg.wardb-kp-denied { color: #ff3b30; opacity: 1; }
    .wardb-kp-msg.wardb-kp-granted { color: #9fd8cb; opacity: 1; }
  `,document.head.appendChild(n)}let Qa=null,Js=null;function Nh(){Qa&&(Qa.remove(),Qa=null),Js&&(document.removeEventListener("keydown",Js),Js=null)}function ei(n){Mx(),Nh();const t=document.createElement("div");t.className="wardb-kp-overlay";const e=document.createElement("div");e.className="wardb-kp-pad";const i=document.createElement("div");i.className="wardb-kp-head",i.textContent="STAFF ACCESS — WING B";const s=document.createElement("div");s.className="wardb-kp-display";const a=document.createElement("div");a.className="wardb-kp-grid";const r=document.createElement("div");r.className="wardb-kp-msg";let o="",l=!1,c=0,h=!1;const d=()=>{s.textContent=o.split("").join(" ")},u=()=>{var _;Nh(),h||(_=n.onAbandon)==null||_.call(n,{attempts:c}),n.onClose()},f=()=>{var _;l=!0,o===n.code?(h=!0,r.textContent="ACCESS GRANTED",r.className="wardb-kp-msg wardb-kp-granted",setTimeout(()=>{n.onSuccess(),u()},500)):(c+=1,r.textContent="DENIED",r.className="wardb-kp-msg wardb-kp-denied",(_=n.onDenied)==null||_.call(n,{attempt:c,entered:o}),setTimeout(()=>{o="",d(),r.textContent="STAFF ACCESS — WING B",r.className="wardb-kp-msg",l=!1},600))};["1","2","3","4","5","6","7","8","9","C","0","×"].forEach(_=>{const m=document.createElement("button");m.className="wardb-kp-key",m.textContent=_,m.addEventListener("click",()=>{if(!l){if(_==="C"){o="",d();return}if(_==="×"){u();return}o.length>=4||(o+=_,d(),o.length===4&&f())}}),_==="×"&&m.classList.add("wardb-kp-exit"),a.appendChild(m)}),e.appendChild(i),e.appendChild(s),e.appendChild(a),e.appendChild(r),t.appendChild(e),document.body.appendChild(t),Qa=t,r.textContent="STAFF ACCESS — WING B",d(),Js=_=>{_.code==="Escape"&&u()},document.addEventListener("keydown",Js)}const ne={legW:.3,legH:1.35,legD:.22,torsoW:.4,torsoH:.95,torsoD:.24,headS:.22,armW:.09,armD:.09,armLen:1.75},lu=.11,yx=.035,Sx=.5,Di=.1,wx=1.8,bx=2,Oh=.55,Fh=.24,zh=.9,Ex=.3,Tx=.03,Ax=Di*1.9,Cx=6,Rx=3,kh=6,Bh=4,Px=1.3;function Lx(){const t=document.createElement("canvas");t.width=128,t.height=128;const e=t.getContext("2d");e.fillStyle="#20221d",e.fillRect(0,0,128,128);for(let s=0;s<40;s++){const a=Math.random()*128,r=Math.random()*128,o=4+Math.random()*10,l=Math.random()<.5,c=e.createRadialGradient(a,r,0,a,r,o);c.addColorStop(0,l?"rgba(120,124,110,0.08)":"rgba(0,0,0,0.10)"),c.addColorStop(1,"rgba(0,0,0,0)"),e.fillStyle=c,e.beginPath(),e.arc(a,r,o,0,Math.PI*2),e.fill()}for(let s=0;s<6;s++){const a=Math.random()*128,r=128*(.35+Math.random()*.6),o=6+Math.random()*16,l=e.createRadialGradient(a,r,0,a,r,o);l.addColorStop(0,"rgba(6,7,5,0.5)"),l.addColorStop(1,"rgba(6,7,5,0)"),e.fillStyle=l,e.beginPath(),e.arc(a,r,o,0,Math.PI*2),e.fill()}e.strokeStyle="rgba(0,0,0,0.14)",e.lineWidth=1;for(let s=10;s<128;s+=18)e.beginPath(),e.moveTo(s+(Math.random()-.5)*6,0),e.lineTo(s+(Math.random()-.5)*6,128),e.stroke();const i=new qe(t);return i.wrapS=Je,i.wrapT=Je,i}function Ix(){const e=document.createElement("canvas");e.width=128,e.height=24;const i=e.getContext("2d");i.fillStyle="#050504",i.fillRect(0,0,128,24);for(let s=0;s<7;s++){const a=Math.random()*128,r=24/2+(Math.random()-.5)*24*.4,o=128*(.08+Math.random()*.14),l=i.createRadialGradient(a,r,0,a,r,o);l.addColorStop(0,`rgba(232,232,224,${.5+Math.random()*.4})`),l.addColorStop(1,"rgba(232,232,224,0)"),i.fillStyle=l,i.beginPath(),i.arc(a,r,o,0,Math.PI*2),i.fill()}return new qe(e)}function Dx(){const t=document.createElement("canvas");t.width=128,t.height=128;const e=t.getContext("2d"),i=e.createRadialGradient(128/2,128/2,0,128/2,128/2,128/2);return i.addColorStop(0,"rgba(255,255,255,1)"),i.addColorStop(.55,"rgba(255,255,255,0.6)"),i.addColorStop(1,"rgba(255,255,255,0)"),e.fillStyle=i,e.fillRect(0,0,128,128),new qe(t)}const Ux=Lx(),Nx=Ix(),Ox=Dx();function Hh(n,t,e,i,s,a){const r=new de,o=s/2,l=new xt(new ae(n,o,t),a);l.position.y=o/2,r.add(l);const c=new xt(new ae(e,o,i),a);return c.position.y=-o/2,r.add(c),r}function Fx(n){const t=new de,e=new $s({color:658185,roughness:.96,metalness:0,emissive:1781270,emissiveIntensity:.1}),i=ne.legW*.42,s=[];for(const m of[-1,1]){const p=new de;p.position.set(m*i,ne.legH,0);const S=Hh(ne.legW*.62,ne.legD*.95,ne.legW*.46,ne.legD*.7,ne.legH,e);S.position.y=-1.35/2,p.add(S),t.add(p),s.push(p)}const a=ne.legH+ne.torsoH/2,r=new $s({map:Ux,roughness:.92,metalness:0,emissive:1781270,emissiveIntensity:.06}),o=new xt(new ae(ne.torsoW,ne.torsoH,ne.torsoD),r);o.position.y=a,o.rotation.x=Di,t.add(o);const l=ne.legH+ne.torsoH-.08,c=ne.torsoW/2+ne.armW/2+.02,h=[];for(const m of[-1,1]){const p=new de;p.position.set(m*c,l,0),p.rotation.x=Di*.5;const S=Hh(ne.armW*1.15,ne.armD*1.15,ne.armW*.7,ne.armD*.7,ne.armLen,e);S.position.y=-1.75/2,p.add(S),t.add(p),h.push(p)}const d=new de,u=ne.legH+ne.torsoH+ne.headS/2+.02;d.position.set(0,u,Math.sin(Di)*.12),d.rotation.z=lu;const f=new xt(new ae(ne.headS,ne.headS,ne.headS),e);d.add(f);const g=new $s({color:1315858,emissive:n,emissiveMap:Nx,emissiveIntensity:.4,roughness:.5}),_=new xt(new ae(ne.headS*.82,.04,.02),g);return _.position.set(0,.01,ne.headS/2+.004),d.add(_),t.add(d),{group:t,headGroup:d,torso:o,legPivots:s,armPivots:h}}function zx(n,t){const e=t*Math.PI/360,i=20,s=[0,.02,0],a=[.5,.5];for(let c=0;c<=i;c++){const h=-e+2*e*c/i,d=Math.sin(h),u=Math.cos(h);s.push(d*n,.02,u*n),a.push(.5+d*.5,.5+u*.5)}const r=[];for(let c=1;c<i+1;c++)r.push(0,c,c+1);const o=new Pn;o.setAttribute("position",new Be(s,3)),o.setAttribute("uv",new Be(a,2)),o.setIndex(r),o.computeVertexNormals();const l=new Qe({color:6689041,alphaMap:Ox,transparent:!0,opacity:.08,side:Un,depthWrite:!1});return new xt(o,l)}function Gh(n,t,e){const i=Math.PI*2,s=((t-n+Math.PI)%i+i)%i-Math.PI;return n+s*e}function kx(n){n.traverse(t=>{t instanceof xt&&(t.geometry.dispose(),t.material.dispose())})}function Bx(n,t,e,i,s){let a=0,r=1;const o=e-n,l=i-t,c=[-o,o,-l,l],h=[n-s.minX,s.maxX-n,t-s.minZ,s.maxZ-t];for(let d=0;d<4;d++)if(c[d]===0){if(h[d]<0)return!1}else{const u=h[d]/c[d];if(c[d]<0){if(u>r)return!1;u>a&&(a=u)}else{if(u<a)return!1;u<r&&(r=u)}}return!0}class fe{constructor(t,e,i,s,a={}){this.scene=t,this.waypoints=e,this.occluders=i,this.callbacks=s,this.fx=0,this.fz=-1,this.wpIdx=0,this.pauseLeft=0,this.ramp=0,this.warned=!1,this.mode="patrol",this.returnPause=0,this.animClock=0,this.headYaw=0,this.idlePauseTimer=0,this.nextIdleSnapAt=kh+Math.random()*Bh,this.root=new de,this.x=e[0].x,this.z=e[0].z,this.colliders=a.colliders??[],this.radius=a.radius??Bt.orderly.radius,this.floorHeightAt=a.floorHeightAt,this.sightRange=a.sightRange??Bt.orderly.sightRange,this.coneDeg=a.coneDeg??Bt.orderly.coneDeg,this.level=a.level??"__flat";const r=Fx(a.eyeTint??16777215);this.unmedMesh=r.group,this.headGroup=r.headGroup,this.torso=r.torso,this.legPivots=r.legPivots,this.armPivots=r.armPivots,this.coneMesh=zx(this.sightRange,this.coneDeg),this.unmedMesh.add(this.coneMesh),this.root.add(this.unmedMesh);const o=this.floorHeightAt?this.floorHeightAt(this.x,this.z):0;this.root.position.set(this.x,o,this.z),t.add(this.root),this.unmedMesh.visible=!1}get watching(){return this.ramp}get chasing(){return this.mode==="chase"}setWardState(t){t==="lucid"&&this.mode==="chase"&&this.beginReturn(),this.unmedMesh.visible=t==="unmed"}update(t,e,i,s,a="__flat"){let r=!1;this.mode==="patrol"?r=this.patrolStep(t):this.mode==="chase"?r=this.chaseStep(t,e,i):r=this.returnStep(t),r&&(this.animClock+=t);const o=Math.atan2(this.fx,this.fz);if(s==="unmed"&&a===this.level){const c=e-this.x,h=i-this.z;Math.hypot(c,h)<Bt.orderly.catchRadius&&(this.beginReturn(),this.callbacks.onCaught())}this.mode==="patrol"&&this.updateSight(t,e,i,s,a),this.updateGait(t,r,o,e,i);const l=this.floorHeightAt?this.floorHeightAt(this.x,this.z):0;this.root.position.set(this.x,l,this.z),this.root.rotation.y=o,this.updateConeVisual()}dispose(){this.scene.remove(this.root),kx(this.unmedMesh)}updateGait(t,e,i,s,a){if(this.headGroup.rotation.z=lu+Math.sin(this.animClock*Sx)*yx,this.ramp>0){const h=s-this.x,d=a-this.z;if(Math.hypot(h,d)>.001){const f=Math.atan2(h,d);this.headYaw=Gh(this.headYaw,f-i,Math.min(1,t*Cx))}}else e?this.headYaw=Gh(this.headYaw,0,Math.min(1,t*Rx)):(this.idlePauseTimer+=t,this.idlePauseTimer>=this.nextIdleSnapAt&&(this.headYaw=(Math.random()-.5)*2*Px,this.idlePauseTimer=0,this.nextIdleSnapAt=kh+Math.random()*Bh));this.headGroup.rotation.y=this.headYaw;const r=this.mode==="chase",o=this.animClock*wx*(r?bx:1);this.legPivots[0].rotation.x=Math.sin(o)*Oh,this.legPivots[1].rotation.x=Math.sin(o+Math.PI)*Oh,this.armPivots[0].rotation.x=Di*.5+Math.sin(o+Math.PI-zh)*Fh,this.armPivots[1].rotation.x=Di*.5+Math.sin(o-zh)*Fh;const l=r?Ex:0;this.armPivots[0].rotation.z=-l,this.armPivots[1].rotation.z=l,this.unmedMesh.position.y=Math.abs(Math.sin(o))*Tx;const c=r?Ax:Di;this.torso.rotation.x+=(c-this.torso.rotation.x)*Math.min(1,t*6)}updateSight(t,e,i,s,a){var o,l;let r=!1;if(s==="unmed"&&a===this.level){const c=e-this.x,h=i-this.z,d=Math.hypot(c,h);if(d>.001&&d<this.sightRange){const u=c/d*this.fx+h/d*this.fz,f=Math.cos(this.coneDeg*Math.PI/360);u>f&&!this.occluded(e,i)&&(r=!0)}}r?(this.ramp=Math.min(1,this.ramp+t/Bt.orderly.graceSec),this.ramp>=Bt.orderly.warnAt&&!this.warned&&(this.warned=!0,this.callbacks.onWarn()),this.ramp>=1&&(this.beginChase(),(l=(o=this.callbacks).onChaseStart)==null||l.call(o))):(this.ramp=Math.max(0,this.ramp-t*1.5),this.ramp<Bt.orderly.warnAt&&(this.warned=!1))}updateConeVisual(){const t=this.coneMesh.material;if(this.mode==="chase")t.color.setHex(16715792),t.opacity=.45;else{const e=this.ramp;t.color.setRGB(.3+.65*e,.05,.05),t.opacity=.08+.32*e}}beginChase(){this.mode="chase",this.ramp=1,this.warned=!1}beginReturn(){this.mode="returning",this.ramp=0,this.warned=!1,this.returnPause=Bt.orderly.escapePauseSec}patrolStep(t){if(this.pauseLeft>0)return this.pauseLeft-=t,!1;const e=this.waypoints[this.wpIdx],i=e.x-this.x,s=e.z-this.z,a=Math.hypot(i,s);if(a<.08)return this.wpIdx=(this.wpIdx+1)%this.waypoints.length,this.pauseLeft=Bt.orderly.pauseAtWaypoint,!1;this.fx=i/a,this.fz=s/a;const r=Math.min(Bt.orderly.speed*t,a);return this.moveBody(this.fx*r,this.fz*r),!0}chaseStep(t,e,i){const s=e-this.x,a=i-this.z,r=Math.hypot(s,a);if(r<.001)return!1;this.fx=s/r,this.fz=a/r;const o=Math.min(Bt.orderly.chaseSpeed*t,r);return this.moveBody(this.fx*o,this.fz*o),!0}returnStep(t){if(this.returnPause>0)return this.returnPause-=t,!1;const e=this.nearestWaypoint(),i=e.pos.x-this.x,s=e.pos.z-this.z,a=Math.hypot(i,s);if(a<.08)return this.wpIdx=e.idx,this.mode="patrol",this.pauseLeft=Bt.orderly.pauseAtWaypoint,!1;this.fx=i/a,this.fz=s/a;const r=Math.min(Bt.orderly.speed*t,a);return this.moveBody(this.fx*r,this.fz*r),!0}nearestWaypoint(){let t=0,e=1/0;for(let i=0;i<this.waypoints.length;i++){const s=Math.hypot(this.waypoints[i].x-this.x,this.waypoints[i].z-this.z);s<e&&(e=s,t=i)}return{idx:t,pos:this.waypoints[t]}}moveBody(t,e){const i={x:this.x,z:this.z,r:this.radius};qd(i,this.x+t,this.z+e,this.colliders,"unmed",this.level),this.x=i.x,this.z=i.z}occluded(t,e){for(const i of this.occluders)if(Bx(this.x,this.z,t,e,i))return!0;return!1}}const Qn={n:{axis:"z",sign:1},s:{axis:"z",sign:-1},w:{axis:"x",sign:1},e:{axis:"x",sign:-1}};function dr(n){const{axis:t,sign:e}=Qn[n];return`${e>0?"p":"n"}${t}`}function Er(n,t){return n+Qn[t].sign*Is}const ur=1.45,Hx=[.16,.75,.55],Gx=[.14,.5,.4],Xx=[.16,.6,.5];function cu(n,t){const[e,i,s]=n;return t==="z"?[s,i,e]:[e,i,s]}function $l(n,t,e,i){const{axis:s,sign:a}=Qn[i.side],r=i.size??t,[o]=r,l=cu(r,s),h=Er(i.wallAt,i.side)+a*(o/2),d=s==="z"?[i.along,i.y??ur,h]:[h,i.y??ur,i.along];return{id:i.id,type:n,size:l,pos:d,mat:e,states:i.states??"both",label:i.label,facing:dr(i.side)}}function kn(n){return $l("dispenser",Hx,"dispenser",n)}function Vx(n){return $l("keypad",Gx,"pad",n)}function nl(n){return $l("switch",Xx,"breaker",n)}const hu=.03,Xh=1.65,Wx=2.6;function Xt(n,t,e,i,s={}){const{axis:a,sign:r}=Qn[t],o=s.proud??hu,c=Er(e,t)+r*o,h=a==="z"?[i,s.y??Xh,c]:[c,s.y??Xh,i],d=a==="z"?r>0?0:Math.PI:r>0?Math.PI/2:-Math.PI/2;return{text:n,size:s.size??Wx,pos:h,rotY:d,big:s.big,id:s.id}}function fr(n,t,e,i){return n.states&&n.states!=="both"&&n.states!==i?!1:t>n.minX&&t<n.maxX&&e>n.minZ&&e<n.maxZ}function Kl(n){const t=n.y??.02;return{trigger:{id:n.id,minX:n.minX,maxX:n.maxX,minZ:n.minZ,maxZ:n.maxZ,states:n.states},block:{size:[n.maxX-n.minX,t*2,n.maxZ-n.minZ],pos:[(n.minX+n.maxX)/2,t,(n.minZ+n.maxZ)/2],mat:"plate",states:n.states}}}function Hn(){return String(Math.floor(Math.random()*1e4)).padStart(4,"0")}function ln(n,t){return n.split("").map((e,i)=>t&&(i<t[0]||i>=t[1])?"–":e).join(" ")}const du=.85;function uu(n,t){const{axis:e,sign:i}=Qn[t.side],s=t.width??2,a=t.height??3,r=t.depth??.2,o=s/2,l=t.hinge??"start",c=e==="z"?[s,a,r]:[r,a,s],h=e==="z"?[t.along,a/2,t.wallAt]:[t.wallAt,a/2,t.along],d={id:t.doorId,type:"door",size:c,pos:h,mat:"door",states:t.states??"both",label:t.doorLabel??"the door",facing:dr(t.side)},u=r/2,f=e==="z"?{minX:t.along-o,maxX:t.along+o,minZ:t.wallAt-u,maxZ:t.wallAt+u,states:t.states}:{minX:t.wallAt-u,maxX:t.wallAt+u,minZ:t.along-o,maxZ:t.along+o,states:t.states};n.colliders.push(f);const g=l==="start"?t.along-o:t.along+o,_=t.openDepth??du,m=t.wallAt-i*_,p=e==="z"?[g,a/2,m]:[m,a/2,g],S=t.openPos??p,y=t.openRotY??Math.PI/2,b=Vx({id:t.keypadId,side:t.keypadSide??t.side,wallAt:t.keypadWallAt??t.wallAt,along:t.keypadAlong,label:t.keypadLabel??"use the keypad",states:t.states});let C=!1;return{door:d,keypad:b,collider:f,isUnlocked:()=>C,isAvailable(E){return E===t.doorId?!1:E===t.keypadId?!C:!0},setCode(E,T){t.code=E,T!==void 0&&(t.successToast=T)},handleInteract(E,T){return E!==t.keypadId?!1:T.state.state==="unmed"?(T.hud.toast(t.refusalToast??"the keypad is a smear of static. you can't read it like this."),!0):(T.telemetry.event("keypad_open"),T.releasePointerLock(),ei({code:t.code,onDenied:L=>T.telemetry.event("keypad_denied",{attempt:L.attempt,entered:L.entered,randomized:yn()}),onAbandon:L=>T.telemetry.event("keypad_close",{attempts:L.attempts}),onSuccess:()=>{C=!0,T.telemetry.event("keypad_success"),T.moveInteractable(t.doorId,S,y),f.minX=999,f.maxX=999.2,T.hud.toast(t.successToast??"the door opens."),T.hud.setObjective(t.successObjective??"the door is open. go."),T.telemetry.event("door_opened")},onClose:()=>{}}),!0)}}}const Zx=[.5,.9,.5];function Yx(n){return{id:n.id,type:"shape_key",size:n.size??Zx,pos:n.pos,mat:"prop",states:"unmed",label:n.label??"take it",shape:n.shape,color:n.color,facing:"pz"}}const qx=2.4,Vh=2.6;function $x(n,t,e,i){const{axis:s,sign:a}=Qn[n],r=hu,l=Er(t,n)+a*r,c=s==="z"?[e,i.y??Vh,l]:[l,i.y??Vh,e],h=s==="z"?a>0?0:Math.PI:a>0?Math.PI/2:-Math.PI/2;return{id:i.id,shapes:i.shapes,pos:c,rotY:h,size:i.size??qx}}const Wh=[.14,.5,.4];function Kx(n,t){const{axis:e,sign:i}=Qn[t.side],s=t.width??2,a=t.height??3,r=t.depth??.2,o=s/2,l=t.hinge??"start",c=e==="z"?[s,a,r]:[r,a,s],h=e==="z"?[t.along,a/2,t.wallAt]:[t.wallAt,a/2,t.along],d={id:t.doorId,type:"door",size:c,pos:h,mat:"door",states:t.states??"both",label:t.doorLabel??"the door",facing:dr(t.side)},u=r/2,f=e==="z"?{minX:t.along-o,maxX:t.along+o,minZ:t.wallAt-u,maxZ:t.wallAt+u,states:t.states}:{minX:t.wallAt-u,maxX:t.wallAt+u,minZ:t.along-o,maxZ:t.along+o,states:t.states};n.colliders.push(f);const g=l==="start"?t.along-o:t.along+o,_=t.openDepth??du,m=t.wallAt-i*_,p=e==="z"?[g,a/2,m]:[m,a/2,g],S=t.openPos??p,y=t.openRotY??Math.PI/2,b=t.lockSide??t.side,C=t.lockWallAt??t.wallAt,E=Qn[b].axis,T=Qn[b].sign,L=Wh[0],w=cu(Wh,E),R=Er(C,b)+T*(L/2),O=E==="z"?[t.lockAlong,ur,R]:[R,ur,t.lockAlong],F={id:t.lockId,type:"shape_lock",size:w,pos:O,mat:"pad",states:t.states??"both",label:t.lockLabel??"use the lock",facing:dr(b)},H=t.keys.map(nt=>Yx({id:nt.id,shape:nt.shape,color:nt.color,pos:nt.pos})),V=$x(t.iconPanelSide,t.iconPanelWallAt,t.iconPanelAlong,{id:t.iconPanelId,shapes:t.keys.map(nt=>({shape:nt.shape,color:nt.color}))}),G=new Set,q=new Set;let X=!1;function lt(){return t.keys.map(nt=>G.has(nt.shape))}return{door:d,lock:F,keys:H,iconPanel:V,collider:f,heldCount:()=>G.size,isAvailable(nt){return nt===t.doorId?!1:nt===t.lockId?!X:!q.has(nt)},handleInteract(nt,rt){const zt=t.keys.find(qt=>qt.id===nt);if(zt)return q.has(nt)||(q.add(nt),G.add(zt.shape),rt.removeInteractable(nt),rt.updateIconPanel(t.iconPanelId,lt()),rt.hud.toast(zt.pickupToast)),!0;if(nt===t.lockId){if(rt.state.state==="unmed"&&!t.allowUnmed)return rt.hud.toast(t.refusalToastUnmed??"the lock is a smear of static. it's not reading shapes right now — it's not reading anything."),!0;if(G.size<t.keys.length){const qt=t.refusalToastIncomplete?t.refusalToastIncomplete(G.size,t.keys.length):`it wants ${t.keys.length} shapes back. you have ${G.size}.`;return rt.hud.toast(qt),!0}return X=!0,rt.telemetry.event("shape_lock_success"),rt.moveInteractable(t.doorId,S,y),f.minX=999,f.maxX=999.2,rt.hud.toast(t.successToast??"the door opens."),rt.hud.setObjective(t.successObjective??"the door is open. go."),rt.telemetry.event("door_opened"),!0}return!1}}}function jl(n,t,e,i,s){return{minX:n,maxX:t,minZ:e,maxZ:i,y:s}}function fu(n,t,e,i,s,a,r){return{minX:n,maxX:t,minZ:e,maxZ:i,axis:s,yLow:a,yHigh:r}}function pu(n,t,e,i,s,a,r,o,l,c){return{id:n,minX:t,maxX:e,minZ:i,maxZ:s,axis:a,yLow:r,levelAtLow:o,yHigh:l,levelAtHigh:c}}function Zh(n,t,e,i={}){return{id:n,baseY:t,floor:e,heightZones:i.heightZones,ramps:i.ramps}}function il(n,t,e){const i=Math.max(e.minX-n,0,n-e.maxX),s=Math.max(e.minZ-t,0,t-e.maxZ);return Math.hypot(i,s)}function jx(n,t,e,i,s,a){const r=s-e,o=a-i,l=r*r+o*o;let c=l>0?((n-e)*r+(t-i)*o)/l:0;c=Math.max(0,Math.min(1,c));const h=e+c*r,d=i+c*o;return Math.hypot(n-h,t-d)}function Jx(n,t,e,i,s){let a=0,r=1;const o=e-n,l=i-t,c=[-o,o,-l,l],h=[n-s.minX,s.maxX-n,t-s.minZ,s.maxZ-t];for(let d=0;d<4;d++)if(c[d]===0){if(h[d]<0)return!1}else{const u=h[d]/c[d];if(c[d]<0){if(u>r)return!1;u>a&&(a=u)}else{if(u<a)return!1;u<r&&(r=u)}}return!0}function Qx(n,t,e,i,s){if(Jx(n,t,e,i,s))return 0;let a=Math.min(il(n,t,s),il(e,i,s));const r=[[s.minX,s.minZ],[s.maxX,s.minZ],[s.maxX,s.maxZ],[s.minX,s.maxZ]];for(const[o,l]of r)a=Math.min(a,jx(o,l,n,t,e,i));return a}function He(n,t,e={}){const i=e.bodyRadius??Bt.orderly.radius,s=e.clearance??i+.1,a=t.filter(r=>r.states===void 0||r.states==="both");for(let r=0;r<n.length;r++){const o=n[r];for(const l of a){const c=il(o.x,o.z,l);if(c<s)throw new Error(`patrol(): waypoint ${r} (${o.x}, ${o.z}) is only ${c.toFixed(2)}m from collider [${l.minX},${l.maxX}]x[${l.minZ},${l.maxZ}] — needs >${s.toFixed(2)}m clearance (body radius ${i} + margin). Move the waypoint or widen the gap.`)}}for(let r=0;r<n.length;r++){const o=n[r],l=n[(r+1)%n.length];for(const c of a){const h=Qx(o.x,o.z,l.x,l.z,c);if(h<s){const d=(r+1)%n.length;throw new Error(`patrol(): leg ${r}->${d} ((${o.x},${o.z}) to (${l.x},${l.z})) passes only ${h.toFixed(2)}m from collider [${c.minX},${c.maxX}]x[${c.minZ},${c.maxZ}] — needs >${s.toFixed(2)}m clearance. This is the room7/room8 wedge bug: his body (radius ${i}) clips the corner mid-leg and freezes there, facing whatever he hit. Move the leg or widen the corridor.`)}}}return n}function tM(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}function pe(n,t){return{onWarn(){n.hud.toast(t.warnToast),n.telemetry.event("orderly_spotted")},onChaseStart(){n.hud.toast(t.chaseToast),n.telemetry.event("orderly_chase")},onCaught(){n.telemetry.event("orderly_caught"),t.onCaught(n)}}}function Jl(n){const t=n.colliders.filter(r=>r.states===void 0||r.states==="both");let e=[],i=!1;function s(r){for(const o of e)o.dispose();e=n.orderlies.map(o=>new fe(r.scene,o.waypoints,o.occluders,pe(r,{warnToast:o.onWarnToast??"he is looking at you.",chaseToast:o.onChaseToast??"run. or stop being visible.",onCaught:l=>{var c,h;l.state.forceState("lucid","catch"),l.shiftFx(),l.teleportPlayer(n.spawn.x,n.spawn.z,n.spawn.level),l.hud.toast(o.onCaughtToast??n.catchToast??'hands. a needle. "not this time," he says.'),(h=(c=n.extraScript)==null?void 0:c.onCaught)==null||h.call(c,l)}}),{colliders:t,floorHeightAt:o.floorHeightAt,level:o.level}));for(const o of e)o.setWardState(r.state.state)}return{onEnter(r){var o,l;(l=(o=n.extraScript)==null?void 0:o.onEnter)==null||l.call(o,r),s(r),i=!1,r.hud.setObjective(n.onEnterObjective)},isAvailable(r,o){var l,c;return((c=(l=n.extraScript)==null?void 0:l.isAvailable)==null?void 0:c.call(l,r,o))??!0},onInteract(r,o){var l,c;return((c=(l=n.extraScript)==null?void 0:l.onInteract)==null?void 0:c.call(l,r,o))??!1},onStateChange(r,o){var l,c;for(const h of e)h.setWardState(r);r==="unmed"&&!i&&(i=!0,o.hud.toast(n.unmedToast??"something throws a shadow that keeps his shape.")),(c=(l=n.extraScript)==null?void 0:l.onStateChange)==null||c.call(l,r,o)},update(r,o,l){var g,_;if((_=(g=n.extraScript)==null?void 0:g.update)==null||_.call(g,r,o,l),e.length===0)return;const c=l.playerPos();for(const m of e)m.update(r,c.x,c.z,l.state.state,c.level);let h=0,d=1/0,u=!1,f=e[0];for(const m of e){const p=Math.hypot(m.x-c.x,m.z-c.z);p<d&&(d=p),m.chasing&&(u=!0),m.watching>h&&(h=m.watching);const S=f.chasing;if(m!==f){if(m.chasing&&!S)f=m;else if(m.chasing===S){if(m.watching>f.watching)f=m;else if(m.watching===f.watching){const y=Math.hypot(f.x-c.x,f.z-c.z);p<y&&(f=m)}}}}if(h>0||u){const m=tM(f.x-c.x,f.z-c.z,c.yaw);l.hud.setThreat(h,m)}else l.hud.setThreat(0,null);l.audio.setThreat(h,d,u)},onLeave(r){var o,l;r.hud.setThreat(0,null),r.audio.setThreat(0,1/0,!1);for(const c of e)c.dispose();e=[],(l=(o=n.extraScript)==null?void 0:o.onLeave)==null||l.call(o,r)}}}const Ve=new Re;Ve.wallX(-3,3,6);Ve.wallZ(0,6,-3);Ve.wallZ(0,6,3);Ve.wallX(-3,-1,0);Ve.wallX(1,3,0);Ve.block([2,3,.26],[0,1.5,0],"wall","unmed");Ve.solid(-1,1,-.13,.13,"unmed");Ve.wallZ(-2,0,-1);Ve.wallZ(-2,0,1);Ve.wallX(-1,1,-2);Ve.block([1.8,2.6,.06],[0,1.4,-1.84],"glow");Ve.block([2,.55,1],[1.7,.28,4.6],"bed");Ve.solid(.7,2.7,4.1,5.1);Ve.block([1,.8,.7],[-2.2,.4,4.7],"prop");Ve.solid(-2.7,-1.7,4.35,5.05);const eM={id:"room1",name:"the Cell",floor:{minX:-3,maxX:3,minZ:-2,maxZ:6},spawn:{x:0,z:4,yaw:Math.PI},blocks:Ve.blocks,colliders:Ve.colliders,scrawls:[{text:`don't
swallow`,size:2.2,pos:[-2.85,1.8,4.7],rotY:Math.PI/2},{text:`there was a door
here once`,size:3,pos:[0,1.9,.2],rotY:0}],interactables:[{id:"cup",type:"pill_cup",size:[.18,.22,.18],pos:[-2.2,.92,4.7],mat:"pill",states:"both",label:"take the pill"},{id:"dispenser1",type:"dispenser",size:[.55,.75,.16],pos:[2.2,1.45,.14],mat:"dispenser",states:"both",label:"use the dispenser"}],lights:[{pos:[0,2]},{pos:[0,5]}],exits:[{to:"room2",minX:-1,maxX:1,minZ:-1.9,maxZ:-.9}]},nM=(()=>{let n=!1,t=!1;return{onEnter(i){i.hud.setObjective("your head is loud. there's a paper cup on the table."),i.hud.toast("take the pill. everyone says so. even the walls.")},isAvailable(i){return i==="cup"?!n:i==="dispenser1"?n:!0},onInteract(i,s){return i==="cup"?(n=!0,s.state.canShift=!0,s.state.forceState("lucid"),s.shiftFx(),s.removeInteractable("cup"),s.hud.toast("the wall remembers it was a door."),s.hud.setObjective("leave the cell — the dispenser by the door hums. [Q / ⇌] shifts what's real."),!0):(i==="dispenser1"&&(t||(t=!0,s.hud.setObjective("walk out. hold on to it."))),!1)}}})(),iM="4118";let sl=iM;function sM(n){yn()&&(sl=Hn(),n.updateScrawlText("codeScrawl",ln(sl)))}const De=new Re;De.wallX(-1.6,1.6,4.5);De.wallZ(-11,4.5,-1.6);De.wallZ(-11,4.5,1.6);De.wallX(-1.6,-.9,-9);De.wallX(.9,1.6,-9);De.wallX(-1.6,1.6,-11);De.block([1.6,2.4,.06],[0,1.35,-10.94],"glow");const al={minX:-.9,maxX:.9,minZ:-9.1,maxZ:-8.9};De.colliders.push(al);De.block([1,.06,.3],[0,2.92,1.2],"glow");De.block([1,.06,.3],[0,2.92,-3.8],"glow");De.block([1,.06,.3],[0,2.92,-7.4],"glow");De.block([.06,2.2,1],[-1.5,1.4,2.4],"wall2");De.block([.08,.3,1.14],[-1.47,2.55,2.4],"wall2");De.block([.08,.3,1.14],[-1.47,.32,2.4],"wall2");De.block([.06,2.2,1],[1.5,1.4,-4.5],"wall2");De.block([.08,.3,1.14],[1.47,2.55,-4.5],"wall2");De.block([.08,.3,1.14],[1.47,.32,-4.5],"wall2");const aM={id:"room2",name:"the Corridor",floor:{minX:-1.6,maxX:1.6,minZ:-11,maxZ:4.5},spawn:{x:0,z:4,yaw:0},blocks:De.blocks,colliders:De.colliders,scrawls:[{id:"codeScrawl",text:"4 1 1 8",size:3.4,pos:[-1.45,1.6,-5.5],rotY:Math.PI/2,big:!0},{text:`they lock it
from the inside`,size:2.6,pos:[1.45,1.7,-6.5],rotY:-Math.PI/2}],interactables:[{id:"keypad1",type:"keypad",size:[.14,.5,.4],pos:[1.41,1.45,-8.3],mat:"pad",states:"both",label:"use the keypad"},{id:"staffdoor",type:"door",size:[1.8,3,.2],pos:[0,1.5,-9],mat:"door",states:"both",label:"the staff door"},{id:"dispenser2",type:"dispenser",size:[.55,.75,.16],pos:[-1.25,1.45,-8.79],mat:"dispenser",states:"both",label:"use the dispenser"},{id:"pill1",type:"pill_pickup",size:[.16,.2,.16],pos:[-1.15,.9,-4.4],mat:"pill",states:"both",label:"take the pill"}],lights:[{pos:[0,2]},{pos:[0,-3]},{pos:[0,-7.5]}],exits:[{to:"room3",minX:-1,maxX:1,minZ:-10.9,maxZ:-9.8}]},rM=(()=>{let n=!1,t=!1;return{onEnter(i){sM(i),i.hud.setObjective("a staff door blocks the ward. it wants a code you don't have.")},isAvailable(i){return i==="staffdoor"?!1:i==="keypad1"?!n:!0},onInteract(i,s){return i==="keypad1"?s.state.state==="unmed"?(s.hud.toast("the keypad is a smear of static. you can't read it like this."),!0):(s.telemetry.event("keypad_open"),s.releasePointerLock(),ei({code:sl,onDenied:()=>s.telemetry.event("keypad_denied"),onSuccess:()=>{n=!0,s.telemetry.event("keypad_success"),s.moveInteractable("staffdoor",[-.9,1.5,-9.85],Math.PI/2),al.minX=999,al.maxX=999.2,s.hud.toast("it was written on the wall the whole time. by whom?"),s.hud.setObjective("through the door. the ward opens up beyond it."),s.telemetry.event("door_opened")},onClose:()=>{}}),!0):!1},onStateChange(i,s){i==="unmed"&&!t&&(t=!0,s.hud.toast("the wall is loud here."))}}})(),ye=new Re;ye.wallX(-5,5,4);ye.wallZ(-5,4,-5);ye.wallZ(-5,4,5);ye.wallX(-5,-1,-5);ye.wallX(1,5,-5);ye.wallZ(-7,-5,-1);ye.wallZ(-7,-5,1);ye.wallX(-1,1,-7);ye.block([1.8,2.6,.06],[0,1.4,-6.94],"glow");const rl={minX:-1,maxX:1,minZ:-5.12,maxZ:-4.88};ye.colliders.push(rl);ye.block([.06,2.7,.06],[-.7,1.5,-4.95],"chain","lucid");ye.block([.06,2.7,.06],[-.25,1.5,-4.95],"chain","lucid");ye.block([.06,2.7,.06],[.25,1.5,-4.95],"chain","lucid");ye.block([.06,2.7,.06],[.7,1.5,-4.95],"chain","lucid");ye.block([.22,.28,.14],[0,1.05,-4.9],"chain","lucid");ye.block([1.4,.5,1.4],[-2.5,.25,-1],"prop");ye.solid(-3.2,-1.8,-1.7,-.3);ye.block([.6,.9,.6],[-.5,.45,1.5],"prop");ye.solid(-.8,-.2,1.2,1.8);const oM={id:"room3",name:"the Common Room",floor:{minX:-5,maxX:5,minZ:-7,maxZ:4},spawn:{x:0,z:3,yaw:0},blocks:ye.blocks,colliders:ye.colliders,scrawls:[{text:`you weren't supposed
to make it this far`,size:3,pos:[-4.85,1.7,2],rotY:Math.PI/2},{text:`it only holds
if you believe it`,size:3.4,pos:[4.85,1.7,-3],rotY:-Math.PI/2,big:!0}],interactables:[{id:"exitdoor",type:"door",size:[2,3,.24],pos:[0,1.5,-5],mat:"door",states:"both",label:"open the door"}],lights:[{pos:[0,2]},{pos:[-2.5,-1]},{pos:[1.5,-3]},{pos:[0,-6]}],exits:[{to:"room4",minX:-1,maxX:1,minZ:-6.9,maxZ:-5.8}]},lM=(()=>{let n=!1;return{onEnter(e){e.hud.setObjective("the exit door, dead ahead. it doesn't look like it wants you lucid.")},onInteract(e,i){return e==="exitdoor"?i.state.state==="lucid"?(i.hud.toast("chained shut. heavy padlock. it looks very, very real."),i.telemetry.event("door_refused"),!0):(i.removeInteractable("exitdoor"),rl.minX=999,rl.maxX=999.2,i.telemetry.event("door_opened"),i.hud.toast("it was never locked. only you were."),i.hud.setObjective("walk through."),!0):!1},onStateChange(e,i){e==="lucid"&&!n&&(n=!0,i.telemetry.event("chains_seen")),e==="unmed"&&i.hud.toast("the chains were never yours.")}}})(),Se=new Re;Se.wallX(-6,6,5);Se.wallZ(-5,5,-6);Se.wallZ(-5,5,6);Se.wallX(-6,-1,-5);Se.wallX(1,6,-5);Se.wallZ(-7,-5,-1);Se.wallZ(-7,-5,1);Se.wallX(-1,1,-7);Se.block([1.8,2.6,.06],[0,1.4,-6.8],"glow");Se.block([2,3,.26],[0,1.5,-5],"wall","lucid");const cM={minX:-1,maxX:1,minZ:-5.13,maxZ:-4.87,states:"lucid"};Se.colliders.push(cM);Se.block([1.3,.9,.1],[4,2.25,-4.8],"glow");Se.block([1.5,.5,.9],[2,.25,.3],"prop");Se.solid(1.25,2.75,-.15,.75);Se.block([1.5,.5,.9],[3.2,.25,2.6],"prop");Se.solid(2.45,3.95,2.15,3.05);const Ds={minX:-3,maxX:-1.4,minZ:-1.4,maxZ:-.6};Se.block([1.6,2.9,.8],[-2.2,1.45,-1],"wall2");Se.solid(Ds.minX,Ds.maxX,Ds.minZ,Ds.maxZ);const hM=Se.colliders.filter(n=>n.states===void 0||n.states==="both"),ol={id:"room4",name:"the Day Room",floor:{minX:-6,maxX:6,minZ:-7,maxZ:5},spawn:{x:0,z:4,yaw:0},blocks:Se.blocks,colliders:Se.colliders,scrawls:[{text:`he counts
your blinks`,size:2.8,pos:[-5.85,1.7,1.5],rotY:Math.PI/2},{text:`the door is only there
when you are honest`,size:3.4,pos:[-5.85,1.7,-3],rotY:Math.PI/2,big:!0},{text:`stand still.
he forgets slow things`,size:2.6,pos:[5.85,1.7,3.5],rotY:-Math.PI/2}],interactables:[{id:"dispenser4",type:"dispenser",size:[.16,.75,.55],pos:[-5.86,1.45,4.2],mat:"dispenser",states:"both",label:"use the dispenser"}],lights:[{pos:[0,3]},{pos:[3.5,0]},{pos:[-3,-1]},{pos:[3,-4]},{pos:[0,-6]}],exits:[{to:"room5",minX:-1,maxX:1,minZ:-6.9,maxZ:-5.8}]},dM=[{x:3.5,z:3},{x:3.5,z:-3},{x:-.5,z:-3},{x:-.5,z:3},{x:1.8,z:3.5}];function uM(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}const fM=(()=>{let n=null,t=!1;function e(s){n==null||n.dispose(),n=new fe(s.scene,dM,[Ds],pe(s,{warnToast:"he is looking at you.",chaseToast:"run. or stop being visible.",onCaught:()=>{s.state.forceState("lucid"),s.shiftFx(),s.teleportPlayer(ol.spawn.x,ol.spawn.z),s.hud.toast('hands. a needle. "there you are," he says.')}}),{colliders:hM}),n.setWardState(s.state.state)}return{onEnter(s){t=!1,e(s),s.hud.setObjective("the day room. he only exists when you do. the door out is the same.")},onStateChange(s,a){n==null||n.setWardState(s),s==="lucid"&&!t&&(t=!0,a.hud.toast("gone. or — no. you just can't see him."))},update(s,a,r){if(!n)return;const o=r.playerPos();n.update(s,o.x,o.z,r.state.state);const l=n.watching,c=n.chasing,h=Math.hypot(n.x-o.x,n.z-o.z);if(l>0||c){const d=uM(n.x-o.x,n.z-o.z,o.yaw);r.hud.setThreat(l,d)}else r.hud.setThreat(0,null);r.audio.setThreat(l,h,c)},onLeave(s){s.hud.setThreat(0,null),s.audio.setThreat(0,1/0,!1),n==null||n.dispose(),n=null}}})(),pM="1907";let Qs=pM;function Yh(n){yn()&&(Qs=Hn(),n.updateScrawlText("codeScrawlA",ln(Qs,[0,2])),n.updateScrawlText("codeScrawlB",ln(Qs,[2,4])))}const le=new Re;le.wallX(-7,7,5);le.wallZ(-6,5,-7);le.wallZ(-6,5,7);le.wallX(-7,-1,-6);le.wallX(1,7,-6);le.wallZ(-8,-6,-1);le.wallZ(-8,-6,1);le.wallX(-1,1,-8);le.block([1.8,2.6,.06],[0,1.4,-7.8],"glow");const ll={minX:-1,maxX:1,minZ:-6.1,maxZ:-5.9};le.colliders.push(ll);const Us={minX:-2.2,maxX:2.2,minZ:-1.3,maxZ:1.3};le.solid(Us.minX,Us.maxX,Us.minZ,Us.maxZ);le.block([1.8,2,.9],[0,1,0],"wall2");le.block([4.4,1.1,.5],[0,.55,1.05],"prop");le.block([4.4,1.1,.5],[0,.55,-1.05],"prop");le.block([.5,1.1,1.3],[-1.95,.55,0],"prop");le.block([.5,1.1,1.3],[1.95,.55,0],"prop");le.block([.7,.5,2.4],[5.3,.25,0],"prop");le.solid(4.95,5.65,-1.2,1.2);le.block([.08,1.3,1.5],[-6.92,1.5,-.9],"pad");le.block([.08,.12,1.6],[-6.92,2.25,-.9],"glow");le.block([1.3,.9,.1],[-4,2.25,4.85],"glow");le.block([1.1,.8,.1],[5.5,2.2,-5.85],"glow");const mM=le.colliders.filter(n=>n.states===void 0||n.states==="both"),cl={id:"room5",name:"the Nurse Station",floor:{minX:-7,maxX:7,minZ:-8,maxZ:5},spawn:{x:0,z:4.3,yaw:0},blocks:le.blocks,colliders:le.colliders,scrawls:[{id:"codeScrawlA",text:"1 9 – –",size:2.2,pos:[-6.85,1.6,.6],rotY:Math.PI/2,big:!0},{id:"codeScrawlB",text:"– – 0 7",size:2.2,pos:[6.85,1.6,0],rotY:-Math.PI/2,big:!0},{text:`the coffee is always warm.
no one drinks it.`,size:2.4,pos:[6.85,1.6,4.3],rotY:-Math.PI/2}],interactables:[{id:"dispenser5",type:"dispenser",size:[.55,.75,.16],pos:[-6.3,1.45,4.86],mat:"dispenser",states:"both",label:"use the dispenser"},{id:"keypad5",type:"keypad",size:[.4,.5,.14],pos:[1.35,1.45,-5.86],mat:"pad",states:"both",label:"use the keypad"},{id:"exitdoor",type:"door",size:[2,3,.2],pos:[0,1.5,-6],mat:"door",states:"both",label:"the exit door"}],lights:[{pos:[0,3.5]},{pos:[-4.5,0]},{pos:[4.5,0]},{pos:[0,-2.5]},{pos:[0,-5.5]}],exits:[{to:"room6",minX:-1,maxX:1,minZ:-7.9,maxZ:-6.8}]},gM=[{x:4.4,z:2.6},{x:4.4,z:-2.6},{x:-4.4,z:-2.6},{x:-4.4,z:2.6}];function _M(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}const vM=(()=>{let n=null,t=!1,e=!1;function i(a){n==null||n.dispose(),n=new fe(a.scene,gM,[Us],pe(a,{warnToast:"he is looking at you.",chaseToast:"run. or stop being visible.",onCaught:()=>{a.state.forceState("lucid"),a.shiftFx(),a.teleportPlayer(cl.spawn.x,cl.spawn.z),a.hud.toast('hands. a needle. "not this time," he says.'),Yh(a)}}),{colliders:mM}),n.setWardState(a.state.state)}return{onEnter(a){Yh(a),i(a),t=!1,e=!1,a.hud.setObjective("the nurse station. the code is written where he walks.")},isAvailable(a){return a==="exitdoor"?!1:a==="keypad5"?!t:!0},onInteract(a,r){return a==="keypad5"?r.state.state==="unmed"?(r.hud.toast("the keypad is a smear of static. you can't read it like this."),!0):(r.telemetry.event("keypad_open"),r.releasePointerLock(),ei({code:Qs,onDenied:()=>r.telemetry.event("keypad_denied"),onSuccess:()=>{t=!0,r.telemetry.event("keypad_success"),r.moveInteractable("exitdoor",[-1,1.5,-6.85],Math.PI/2),ll.minX=999,ll.maxX=999.2,r.hud.toast(`${Qs}. someone never finished their shift.`),r.hud.setObjective("the door is open. go."),r.telemetry.event("door_opened")},onClose:()=>{}}),!0):!1},onStateChange(a,r){n==null||n.setWardState(a),a==="unmed"&&!e&&(e=!0,r.hud.toast("the station throws a shadow. it moves with him, not for you."))},update(a,r,o){if(!n)return;const l=o.playerPos();n.update(a,l.x,l.z,o.state.state);const c=n.watching,h=n.chasing,d=Math.hypot(n.x-l.x,n.z-l.z);if(c>0||h){const u=_M(n.x-l.x,n.z-l.z,l.yaw);o.hud.setThreat(c,u)}else o.hud.setThreat(0,null);o.audio.setThreat(c,d,h)},onLeave(a){a.hud.setThreat(0,null),a.audio.setThreat(0,1/0,!1),n==null||n.dispose(),n=null}}})(),xM="6329";let pr=xM;function qh(n){yn()&&(pr=Hn(),n.updateScrawlText("codeScrawl",ln(pr)))}const Ue=new Re;Ue.wallZ(-4.6,8,-1.6);Ue.wallZ(-1.2,8,1.6);Ue.wallX(-1.6,1.6,8);Ue.wallX(1.6,12,-1.2);Ue.wallX(-1.6,5.5,-4.6);Ue.wallX(7.1,12,-4.6);Ue.wallZ(-4.6,-3.9,12);Ue.wallZ(-1.9,-1.2,12);const hl={minX:11.88,maxX:12.12,minZ:-3.9,maxZ:-1.9};Ue.colliders.push(hl);Ue.wallX(12,14,-3.9);Ue.wallX(12,14,-1.9);Ue.wallZ(-3.9,-1.9,14);Ue.block([.06,2.6,1.6],[13.75,1.4,-2.9],"glow");Ue.wallZ(-6.1,-4.6,5.5);Ue.wallZ(-6.1,-4.6,7.1);Ue.wallX(5.5,7.1,-6.1);const MM={minX:5.38,maxX:5.62,minZ:-6.1,maxZ:-4.6},yM={minX:6.98,maxX:7.22,minZ:-6.1,maxZ:-4.6},SM=Ue.colliders.filter(n=>n.states===void 0||n.states==="both"),dl={id:"room6",name:"the West Corridor",floor:{minX:-1.8,maxX:14,minZ:-6.3,maxZ:8},spawn:{x:0,z:7,yaw:0},blocks:Ue.blocks,colliders:Ue.colliders,scrawls:[{text:`he learned this hallway
before you did`,size:3,pos:[-1.45,1.7,3],rotY:Math.PI/2},{text:`count his steps.
then move.`,size:2.6,pos:[6.3,1.6,-1.45],rotY:Math.PI},{id:"codeScrawl",text:"6 3 2 9",size:2.4,pos:[8.3,1.6,-4.35],rotY:0,big:!0}],interactables:[{id:"dispenser6",type:"dispenser",size:[.55,.75,.16],pos:[6.3,1.45,-5.85],mat:"dispenser",states:"both",facing:"pz",label:"use the dispenser"},{id:"keypad6",type:"keypad",size:[.14,.5,.4],pos:[11.75,1.45,-2.9],mat:"pad",states:"both",label:"use the keypad"},{id:"exitdoor",type:"door",size:[.2,3,2],pos:[12,1.5,-2.9],mat:"door",states:"both",label:"the exit door"}],lights:[{pos:[0,6]},{pos:[0,1]},{pos:[0,-2]},{pos:[3,-2.9]},{pos:[6.3,-2.9]},{pos:[6.3,-5.3]},{pos:[9.5,-2.9]},{pos:[12.5,-2.9]}],exits:[{to:"room7",minX:13.2,maxX:14,minZ:-3.9,maxZ:-1.9}]},wM=[{x:0,z:.8},{x:0,z:-2},{x:4,z:-3.75},{x:9.2,z:-2},{x:4,z:-3.75},{x:0,z:-2}];function bM(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}const EM=(()=>{let n=null,t=!1,e=!1;function i(a){n==null||n.dispose(),n=new fe(a.scene,wM,[MM,yM],pe(a,{warnToast:"he is looking at you.",chaseToast:"run. or stop being visible.",onCaught:()=>{a.state.forceState("lucid"),a.shiftFx(),a.teleportPlayer(dl.spawn.x,dl.spawn.z),a.hud.toast('hands. a needle. "back to the start," he says.'),qh(a)}}),{colliders:SM}),n.setWardState(a.state.state)}return{onEnter(a){qh(a),i(a),t=!1,e=!1,a.hud.setObjective("the corridor bends. the way out wants a code, and it is not on the keypad.")},isAvailable(a){return a==="exitdoor"?!1:a==="keypad6"?!t:!0},onInteract(a,r){return a==="keypad6"?r.state.state==="unmed"?(r.hud.toast("the keypad is a smear of static. you can't read it like this."),!0):(r.telemetry.event("keypad_open"),r.releasePointerLock(),ei({code:pr,onDenied:()=>r.telemetry.event("keypad_denied"),onSuccess:()=>{t=!0,r.telemetry.event("keypad_success"),r.moveInteractable("exitdoor",[12.85,1.5,-1.9],Math.PI/2),hl.minX=999,hl.maxX=999.2,r.hud.toast(`${pr}. someone counted his steps before you.`),r.hud.setObjective("the door is open. go."),r.telemetry.event("door_opened")},onClose:()=>{}}),!0):!1},onStateChange(a,r){n==null||n.setWardState(a),a==="unmed"&&!e&&(e=!0,r.hud.toast("the corridor goes red at the edges. he goes solid."))},update(a,r,o){if(!n)return;const l=o.playerPos();n.update(a,l.x,l.z,o.state.state);const c=n.watching,h=n.chasing,d=Math.hypot(n.x-l.x,n.z-l.z);if(c>0||h){const u=bM(n.x-l.x,n.z-l.z,l.yaw);o.hud.setThreat(c,u)}else o.hud.setThreat(0,null);o.audio.setThreat(c,d,h)},onLeave(a){a.hud.setThreat(0,null),a.audio.setThreat(0,1/0,!1),n==null||n.dispose(),n=null}}})(),TM="0452";let mr=TM;function $h(n){yn()&&(mr=Hn(),n.updateScrawlText("codeScrawl",ln(mr)))}const me=new Re;me.wallX(-6,6,5);me.wallZ(-5,.8,-6);me.wallZ(1.8,5,-6);me.wallZ(-5,5,6);me.wallX(-6,-1,-5);me.wallX(1,6,-5);me.wallZ(-7,-5,-1);me.wallZ(-7,-5,1);me.wallX(-1,1,-7);me.block([1.8,2.6,.06],[0,1.4,-6.94],"glow");const ul={minX:-1,maxX:1,minZ:-5.13,maxZ:-4.87};me.colliders.push(ul);const Ns={minX:-6,maxX:-1.5,minZ:1.8,maxZ:2.6};me.block([4.5,2.6,.8],[-3.75,1.3,2.2],"wall2");me.solid(Ns.minX,Ns.maxX,Ns.minZ,Ns.maxZ);const Os={minX:1.5,maxX:6,minZ:-.4,maxZ:.4};me.block([4.5,2.6,.8],[3.75,1.3,0],"wall2");me.solid(Os.minX,Os.maxX,Os.minZ,Os.maxZ);const Fs={minX:-6,maxX:-1.5,minZ:-2.6,maxZ:-1.8};me.block([4.5,2.6,.8],[-3.75,1.3,-2.2],"wall2");me.solid(Fs.minX,Fs.maxX,Fs.minZ,Fs.maxZ);me.wallX(-7.4,-6,.8);me.wallX(-7.4,-6,1.8);me.wallZ(.8,1.8,-7.4);const AM=me.colliders.filter(n=>n.states===void 0||n.states==="both"),fl={id:"room7",name:"the Records Room",floor:{minX:-7.5,maxX:6,minZ:-7,maxZ:5},spawn:{x:0,z:4,yaw:0},blocks:me.blocks,colliders:me.colliders,scrawls:[{text:`they keep the quiet
behind the files`,size:2.8,pos:[5.85,1.7,3.5],rotY:-Math.PI/2},{text:`the files don't forget.
neither does he.`,size:2.8,pos:[-5.85,1.7,-1],rotY:Math.PI/2},{id:"codeScrawl",text:"0 4 5 2",size:2.4,pos:[-5.85,1.7,3.7],rotY:Math.PI/2,big:!0},{text:`you walked right past it.
back the way you came.`,size:2.6,pos:[5.85,1.7,-4],rotY:-Math.PI/2}],interactables:[{id:"dispenser7",type:"dispenser",size:[.55,.75,.16],pos:[-6.7,1.45,1.05],mat:"dispenser",states:"both",facing:"pz",label:"use the dispenser"},{id:"keypad7",type:"keypad",size:[.4,.5,.14],pos:[1.35,1.45,-4.75],mat:"pad",states:"both",label:"use the keypad"},{id:"exitdoor",type:"door",size:[2,3,.2],pos:[0,1.5,-5],mat:"door",states:"both",label:"the exit door"}],lights:[{pos:[0,4]},{pos:[-3.75,2.2]},{pos:[3.75,0]},{pos:[-3.75,-2.2]},{pos:[0,-3.5]},{pos:[-6.5,1.05]},{pos:[0,-6]}],exits:[{to:"room8",minX:-1,maxX:1,minZ:-6.9,maxZ:-5.8}]},CM=[{x:-4.3,z:1.3},{x:1,z:1.3},{x:1,z:.3},{x:-4.3,z:.3}];function RM(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}const PM=(()=>{let n=null,t=!1,e=!1;function i(a){n==null||n.dispose(),n=new fe(a.scene,CM,[Ns,Os,Fs],pe(a,{warnToast:"he is looking at you.",chaseToast:"run. or stop being visible.",onCaught:()=>{a.state.forceState("lucid"),a.shiftFx(),a.teleportPlayer(fl.spawn.x,fl.spawn.z),a.hud.toast(`hands. a needle. "you'll lose your place," he says.`),$h(a)}}),{colliders:AM}),n.setWardState(a.state.state)}return{onEnter(a){$h(a),i(a),t=!1,e=!1,a.hud.setObjective("the records room. paperwork nobody reads. something hums, somewhere behind it.")},isAvailable(a){return a==="exitdoor"?!1:a==="keypad7"?!t:!0},onInteract(a,r){return a==="keypad7"?r.state.state==="unmed"?(r.hud.toast("the keypad is a smear of static. you can't read it like this."),!0):(r.telemetry.event("keypad_open"),r.releasePointerLock(),ei({code:mr,onDenied:()=>r.telemetry.event("keypad_denied"),onSuccess:()=>{t=!0,r.telemetry.event("keypad_success"),r.moveInteractable("exitdoor",[-1,1.5,-5.85],Math.PI/2),ul.minX=999,ul.maxX=999.2,r.hud.toast(`${mr}. filed under nothing.`),r.hud.setObjective("the door is open. go."),r.telemetry.event("door_opened")},onClose:()=>{}}),!0):!1},onStateChange(a,r){n==null||n.setWardState(a),a==="unmed"&&!e&&(e=!0,r.hud.toast("the shelves throw a shadow that keeps his shape."))},update(a,r,o){if(!n)return;const l=o.playerPos();n.update(a,l.x,l.z,o.state.state);const c=n.watching,h=n.chasing,d=Math.hypot(n.x-l.x,n.z-l.z);if(c>0||h){const u=RM(n.x-l.x,n.z-l.z,l.yaw);o.hud.setThreat(c,u)}else o.hud.setThreat(0,null);o.audio.setThreat(c,d,h)},onLeave(a){a.hud.setThreat(0,null),a.audio.setThreat(0,1/0,!1),n==null||n.dispose(),n=null}}})(),LM="2846";let ta=LM;function Kh(n){yn()&&(ta=Hn(),n.updateScrawlText("codeScrawlA",ln(ta,[0,2])),n.updateScrawlText("codeScrawlB",ln(ta,[2,4])))}const ce=new Re;ce.wallX(-9,9,6);ce.wallZ(-8,6,-9);ce.wallZ(-8,.4,9);ce.wallZ(2,6,9);ce.wallX(-9,-1,-8);ce.wallX(1,9,-8);ce.wallZ(-10,-8,-1);ce.wallZ(-10,-8,1);ce.wallX(-1,1,-10);ce.block([1.8,2.6,.06],[0,1.4,-9.8],"glow");const pl={minX:-1,maxX:1,minZ:-8.13,maxZ:-7.87};ce.colliders.push(pl);const zs={minX:-1.9,maxX:1.9,minZ:-1.3,maxZ:1.3};ce.solid(zs.minX,zs.maxX,zs.minZ,zs.maxZ);ce.block([1.6,2,.9],[0,1,0],"wall2");ce.block([3.8,1.1,.5],[0,.55,1.05],"prop");ce.block([3.8,1.1,.5],[0,.55,-1.05],"prop");ce.block([.5,1.1,1.3],[-1.65,.55,0],"prop");ce.block([.5,1.1,1.3],[1.65,.55,0],"prop");ce.wallX(9,10.5,.4);ce.wallX(9,10.5,2);ce.wallZ(.4,2,10.5);const IM={minX:9,maxX:10.5,minZ:.28,maxZ:.52},DM={minX:9,maxX:10.5,minZ:1.88,maxZ:2.12},ks={minX:-8.49,maxX:-7.89,minZ:-3.6,maxZ:-2.4};ce.block([.6,1.6,1.2],[-8.19,.8,-3],"prop");ce.solid(ks.minX,ks.maxX,ks.minZ,ks.maxZ);const jh=ce.colliders.filter(n=>n.states===void 0||n.states==="both"),Jh=[zs,IM,DM,ks],ml={id:"room8",name:"the East Ward",floor:{minX:-9,maxX:10.5,minZ:-10,maxZ:6},spawn:{x:0,z:5,yaw:0},blocks:ce.blocks,colliders:ce.colliders,scrawls:[{text:`two sets of footsteps.
only one of them is yours`,size:2.8,pos:[8.75,1.7,4],rotY:-Math.PI/2},{id:"codeScrawlA",text:"2 8 – –",size:2.2,pos:[0,1.6,1.9],rotY:0,big:!0},{id:"codeScrawlB",text:"– – 4 6",size:2.2,pos:[0,1.6,-1.9],rotY:Math.PI,big:!0}],interactables:[{id:"dispenser8",type:"dispenser",size:[.16,.75,.55],pos:[10.36,1.45,1.2],mat:"dispenser",states:"both",facing:"nx",label:"use the dispenser"},{id:"keypad8",type:"keypad",size:[.4,.5,.14],pos:[1.35,1.45,-7.75],mat:"pad",states:"both",label:"use the keypad"},{id:"exitdoor",type:"door",size:[2,3,.2],pos:[0,1.5,-8],mat:"door",states:"both",label:"the exit door"}],lights:[{pos:[0,4.5]},{pos:[0,1.5]},{pos:[0,-1.5]},{pos:[5,3]},{pos:[5,-4]},{pos:[-5,3]},{pos:[-5,-4]},{pos:[9,1]},{pos:[0,-6]},{pos:[0,-9]}],exits:[{to:"room9",minX:-1,maxX:1,minZ:-9.9,maxZ:-8.8}]},UM=[{x:-3.2,z:2.1},{x:-3.2,z:-2.1},{x:3.2,z:-2.1},{x:3.2,z:2.1}],NM=[{x:7.5,z:-5.5},{x:0,z:-2.5},{x:-7.3,z:-5.5},{x:-7.3,z:4.5},{x:0,z:2.5},{x:7.5,z:4.5}];function OM(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}const FM=(()=>{let n=null,t=null,e=!1,i=!1;function s(o){o.state.forceState("lucid"),o.shiftFx(),o.teleportPlayer(ml.spawn.x,ml.spawn.z),o.hud.toast('hands. a needle. "there are two of us now," he says.'),Kh(o)}function a(o){n==null||n.dispose(),t==null||t.dispose(),n=new fe(o.scene,UM,Jh,pe(o,{warnToast:"he is looking at you.",chaseToast:"run. or stop being visible.",onCaught:s}),{colliders:jh}),t=new fe(o.scene,NM,Jh,pe(o,{warnToast:"the other one is looking at you too.",chaseToast:"run. or stop being visible.",onCaught:s}),{colliders:jh}),n.setWardState(o.state.state),t.setWardState(o.state.state)}return{onEnter(o){Kh(o),a(o),e=!1,i=!1,o.hud.setObjective("the east ward. two of them, now. the code is split, same as before.")},isAvailable(o){return o==="exitdoor"?!1:o==="keypad8"?!e:!0},onInteract(o,l){return o==="keypad8"?l.state.state==="unmed"?(l.hud.toast("the keypad is a smear of static. you can't read it like this."),!0):(l.telemetry.event("keypad_open"),l.releasePointerLock(),ei({code:ta,onDenied:()=>l.telemetry.event("keypad_denied"),onSuccess:()=>{e=!0,l.telemetry.event("keypad_success"),l.moveInteractable("exitdoor",[-1,1.5,-8.85],Math.PI/2),pl.minX=999,pl.maxX=999.2,l.hud.toast(`${ta}. the last door.`),l.hud.setObjective("the door is open. go."),l.telemetry.event("door_opened")},onClose:()=>{}}),!0):!1},onStateChange(o,l){n==null||n.setWardState(o),t==null||t.setWardState(o),o==="unmed"&&!i&&(i=!0,l.hud.toast("the island throws two shadows now."))},update(o,l,c){if(!n||!t)return;const h=c.playerPos();n.update(o,h.x,h.z,c.state.state),t.update(o,h.x,h.z,c.state.state);const d=Math.hypot(n.x-h.x,n.z-h.z),u=Math.hypot(t.x-h.x,t.z-h.z),f=n.chasing||t.chasing,g=Math.max(n.watching,t.watching),_=Math.min(d,u);if(g>0||f){let m=n;(t.chasing&&!n.chasing||n.chasing===t.chasing&&(t.watching>n.watching||t.watching===n.watching&&u<d))&&(m=t);const p=OM(m.x-h.x,m.z-h.z,h.yaw);c.hud.setThreat(g,p)}else c.hud.setThreat(0,null);c.audio.setThreat(g,_,f)},onLeave(o){o.hud.setThreat(0,null),o.audio.setThreat(0,1/0,!1),n==null||n.dispose(),t==null||t.dispose(),n=null,t=null}}})(),zM="5216";let gr=zM;function kM(n){yn()&&(gr=Hn(),n.updateScrawlText("codeScrawl",ln(gr)))}const Ye=new Re;Ye.wallX(-5,5,5);Ye.wallZ(-6,5,-5);Ye.wallZ(-6,5,5);Ye.wallX(-5,-1,-6);Ye.wallX(1,5,-6);Ye.wallZ(-8,-6,-1);Ye.wallZ(-8,-6,1);Ye.wallX(-1,1,-8);Ye.block([1.8,2.6,.06],[0,1.4,-7.8],"glow");const gl={minX:-1,maxX:1,minZ:-6.13,maxZ:-5.87};Ye.colliders.push(gl);Ye.block([2,.9,1],[1,.45,-2.5],"prop");Ye.solid(0,2,-3,-2);Ye.block([.16,1.9,.16],[-4.4,.95,-3.6],"prop");Ye.solid(-4.48,-4.32,-3.68,-3.52);const BM={id:"room9",name:"the Doctor's Office",floor:{minX:-5,maxX:5,minZ:-8,maxZ:5},spawn:{x:0,z:4.3,yaw:0},blocks:Ye.blocks,colliders:Ye.colliders,scrawls:[{text:`they dose you small
so you stay small`,size:2.6,pos:[4.85,1.7,-1],rotY:-Math.PI/2},{text:`his coat still smells
like the ward`,size:2.4,pos:[-4.85,1.7,-3.6],rotY:Math.PI/2},{id:"codeScrawl",text:"5 2 1 6",size:2.2,pos:[-4.85,1.7,1],rotY:Math.PI/2,big:!0}],interactables:[{id:"bottle",type:"pill_pickup",size:[.22,.28,.22],pos:[-4.4,1.55,-3.4],mat:"pill",states:"both",label:"search the coat"},{id:"dispenser9",type:"dispenser",size:[.16,.75,.55],pos:[4.72,1.45,1],mat:"dispenser",states:"both",label:"use the dispenser"},{id:"keypad9",type:"keypad",size:[.4,.5,.14],pos:[1.35,1.45,-5.75],mat:"pad",states:"both",label:"use the keypad"},{id:"exitdoor",type:"door",size:[2,3,.2],pos:[0,1.5,-6],mat:"door",states:"both",label:"the exit door"}],lights:[{pos:[0,4]},{pos:[-3,1]},{pos:[3,1]},{pos:[0,-1.5]},{pos:[0,-4.5]}],exits:[{to:"room10",minX:-1,maxX:1,minZ:-7.9,maxZ:-6.8}]},HM=(()=>{let n=!1,t=!1,e=!1;const i="not yet. take what's hanging there.",s={x:0,z:-6},a=2.5;function r(l){n||e||(e=!0,l.hud.toast(i),l.telemetry.event("coat_gate_nudge"))}return{onEnter(l){kM(l),n=!1,t=!1,e=!1,l.hud.setObjective("the doctor's office. gone quiet. there's a coat on the rack, heavier than it should be — take it before anything else.")},isAvailable(l){return l==="exitdoor"?!1:l==="keypad9"?n&&!t:!0},onInteract(l,c){if(l==="bottle"){if(n)return!0;n=!0,c.removeInteractable("bottle");const h=c.state.pills>=c.state.maxPills;return h||(c.state.refill(),c.hud.setPills(c.state.pills,c.state.maxPills,c.state.canShift),c.hud.pillPopup("+1 pill")),c.hud.toast(h?"someone's coat, one pocket lined with foil. already empty — you're carrying all it had.":"someone's coat, one pocket lined with foil. a pill, loose. pocketed."),c.telemetry.event("coat_pill_found"),c.hud.setObjective("the code is written where you can't read it clean."),!0}return l==="keypad9"?c.state.state==="unmed"?(c.hud.toast("the keypad is a smear of static. you can't read it like this."),!0):(c.telemetry.event("keypad_open"),c.releasePointerLock(),ei({code:gr,onDenied:()=>c.telemetry.event("keypad_denied"),onSuccess:()=>{t=!0,c.telemetry.event("keypad_success"),c.moveInteractable("exitdoor",[-1,1.5,-6.85],Math.PI/2),gl.minX=999,gl.maxX=999.2,c.hud.toast(`${gr}. someone else needed reminding, once.`),c.hud.setObjective("the door is open. go."),c.telemetry.event("door_opened")},onClose:()=>{}}),!0):!1},update(l,c,h){if(n||e)return;const d=h.playerPos(),u=Math.hypot(d.x-1.35,d.z- -5.75)<a,f=Math.hypot(d.x-s.x,d.z-s.z)<a;(u||f)&&r(h)}}})(),GM="3175";let ea=GM;function Qh(n){yn()&&(ea=Hn(),n.updateScrawlText("codeScrawlA",ln(ea,[0,2])),n.updateScrawlText("codeScrawlB",ln(ea,[2,4])))}const Ot=new Re;Ot.wallZ(-26,-15.4,-8);Ot.wallZ(-13.8,-9.4,-8);Ot.wallZ(-7.8,8,-8);Ot.wallZ(-26,-19.4,8);Ot.wallZ(-17.8,8,8);Ot.wallX(-8,8,8);Ot.wallX(-8,-1,-26);Ot.wallX(1,8,-26);const _l={minX:-1,maxX:1,minZ:-26.13,maxZ:-25.87};Ot.colliders.push(_l);Ot.wallZ(-28,-26,-1);Ot.wallZ(-28,-26,1);Ot.wallX(-1,1,-28);Ot.block([1.8,2.6,.06],[0,1.4,-27.8],"glow");Ot.wallX(-8,-2,0);Ot.wallX(2,8,0);Ot.wallX(-8,-2,-10);Ot.wallX(2,8,-10);Ot.block([4,3,.24],[0,1.5,-10],"wall","unmed");Ot.solid(-2,2,-10.12,-9.88,"unmed");Ot.wallX(-8,-2,-20);Ot.wallX(2,8,-20);Ot.block([4,3,.24],[0,1.5,-20],"wall","unmed");Ot.solid(-2,2,-20.12,-19.88,"unmed");const Bs={minX:-1.7,maxX:1.7,minZ:-5.2,maxZ:-3.8};Ot.block([3.4,1.8,1.4],[0,.9,-4.5],"wall2");Ot.solid(Bs.minX,Bs.maxX,Bs.minZ,Bs.maxZ);Ot.wallX(-9.6,-8,-9.4);Ot.wallX(-9.6,-8,-7.8);Ot.wallZ(-9.4,-7.8,-9.6);const XM={minX:-9.6,maxX:-8,minZ:-9.4,maxZ:-7.8};Ot.wallX(8,9.6,-19.4);Ot.wallX(8,9.6,-17.8);Ot.wallZ(-19.4,-17.8,9.6);const VM={minX:8,maxX:9.6,minZ:-19.4,maxZ:-17.8};Ot.wallX(-9.6,-8,-15.4);Ot.wallX(-9.6,-8,-13.8);Ot.wallZ(-15.4,-13.8,-9.6);const WM={minX:-9.6,maxX:-8,minZ:-15.4,maxZ:-13.8};Ot.block([.12,.14,1.6],[-8,2.7,-8.6],"glow");Ot.block([.12,.14,1.6],[8,2.7,-18.6],"glow");Ot.block([.12,.14,1.6],[-8,2.7,-14.6],"glow");const td=Ot.colliders.filter(n=>n.states===void 0||n.states==="both"),vl={id:"room10",name:"the Wing",floor:{minX:-9.6,maxX:9.6,minZ:-28,maxZ:8},spawn:{x:0,z:7,yaw:0},blocks:Ot.blocks,colliders:Ot.colliders,scrawls:[{id:"codeScrawlA",text:"3 1 – –",size:2.2,pos:[-9.46,1.7,-8.6],rotY:Math.PI/2,big:!0},{id:"codeScrawlB",text:"– – 7 5",size:2.2,pos:[9.46,1.7,-18.6],rotY:-Math.PI/2,big:!0},{text:`they scratch their numbers
where the west wall breaks`,size:2.8,pos:[7.86,1.7,-5],rotY:-Math.PI/2},{text:`the rest is written
where the east wall breaks`,size:2.8,pos:[-7.86,1.7,-16.5],rotY:Math.PI/2},{text:`the doors only open
for the calm ones`,size:2.6,pos:[-5,1.7,-9.85],rotY:0}],interactables:[{id:"dispenser10a",type:"dispenser",size:[.16,.75,.55],pos:[-7.72,1.45,4],mat:"dispenser",states:"both",label:"use the dispenser"},{id:"dispenser10b",type:"dispenser",size:[.16,.75,.55],pos:[-9.46,1.45,-14.6],mat:"dispenser",states:"both",facing:"px",label:"use the dispenser"},{id:"dispenser10c",type:"dispenser",size:[.16,.75,.55],pos:[-7.72,1.45,-23],mat:"dispenser",states:"both",facing:"px",label:"use the dispenser"},{id:"keypad10",type:"keypad",size:[.4,.5,.14],pos:[1.35,1.45,-25.75],mat:"pad",states:"both",label:"use the keypad"},{id:"exitdoor",type:"door",size:[2,3,.2],pos:[0,1.5,-26],mat:"door",states:"both",label:"the exit door"}],lights:[{pos:[0,6]},{pos:[0,2]},{pos:[4,-2]},{pos:[-4,-2]},{pos:[4,-6]},{pos:[-4,-6]},{pos:[0,-9]},{pos:[4,-12]},{pos:[-4,-12]},{pos:[4,-16]},{pos:[-4,-16]},{pos:[0,-19]},{pos:[0,-22]},{pos:[0,-25]}],exits:[{to:"room11",minX:-1,maxX:1,minZ:-27.9,maxZ:-26.8}]},ZM=[{x:6.5,z:-1.5},{x:6.5,z:-8.5},{x:-6.5,z:-8.5},{x:-6.5,z:-1.5}],YM=[{x:6.5,z:-11.5},{x:6.5,z:-18.5},{x:-6.5,z:-18.5},{x:-6.5,z:-11.5}];function qM(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}const $M=(()=>{let n=null,t=null,e=!1,i=!1;function s(o){o.state.forceState("lucid"),o.shiftFx(),o.teleportPlayer(vl.spawn.x,vl.spawn.z),o.hud.toast('hands. a needle. "the whole wing, and you got this far," he says.'),Qh(o)}function a(o){n==null||n.dispose(),t==null||t.dispose(),n=new fe(o.scene,ZM,[Bs,XM],pe(o,{warnToast:"he is looking at you.",chaseToast:"run. or stop being visible.",onCaught:s}),{colliders:td}),t=new fe(o.scene,YM,[VM,WM],pe(o,{warnToast:"the other one sees you too.",chaseToast:"run. or stop being visible.",onCaught:s}),{colliders:td}),n.setWardState(o.state.state),t.setWardState(o.state.state)}return{onEnter(o){Qh(o),a(o),e=!1,i=!1,o.hud.setObjective("the wing. it just keeps going. two of them somewhere in it, and the halls only open for the calm.")},isAvailable(o){return o==="exitdoor"?!1:o==="keypad10"?!e:!0},onInteract(o,l){return o==="keypad10"?l.state.state==="unmed"?(l.hud.toast("the keypad is a smear of static. you can't read it like this."),!0):(l.telemetry.event("keypad_open"),l.releasePointerLock(),ei({code:ea,onDenied:()=>l.telemetry.event("keypad_denied"),onSuccess:()=>{e=!0,l.telemetry.event("keypad_success"),l.moveInteractable("exitdoor",[-1,1.5,-26.85],Math.PI/2),_l.minX=999,_l.maxX=999.2,l.hud.toast(`${ea}. the last door in the building.`),l.hud.setObjective("the door is open. go."),l.telemetry.event("door_opened")},onClose:()=>{}}),!0):!1},onStateChange(o,l){n==null||n.setWardState(o),t==null||t.setWardState(o),o==="unmed"&&!i&&(i=!0,l.hud.toast("every doorway behind you just sealed shut."))},update(o,l,c){if(!n||!t)return;const h=c.playerPos();n.update(o,h.x,h.z,c.state.state),t.update(o,h.x,h.z,c.state.state);const d=Math.hypot(n.x-h.x,n.z-h.z),u=Math.hypot(t.x-h.x,t.z-h.z),f=n.chasing||t.chasing,g=Math.max(n.watching,t.watching),_=Math.min(d,u);if(g>0||f){let m=n;(t.chasing&&!n.chasing||n.chasing===t.chasing&&(t.watching>n.watching||t.watching===n.watching&&u<d))&&(m=t);const p=qM(m.x-h.x,m.z-h.z,h.yaw);c.hud.setThreat(g,p)}else c.hud.setThreat(0,null);c.audio.setThreat(g,_,f)},onLeave(o){o.hud.setThreat(0,null),o.audio.setThreat(0,1/0,!1),n==null||n.dispose(),t==null||t.dispose(),n=null,t=null}}})(),KM="2593",mi=.9;function ed(n){if(!yn())return;const t=Hn();ra.setCode(t,`${t}. gravity was the last lock.`),n.updateScrawlText("codeScrawl",ln(t))}const Wt=new Re;Wt.wallX(-9,9,22);Wt.wallZ(12,22,-9);Wt.wallZ(12,22,9);Wt.wallX(-9,-2,12);Wt.wallX(2,9,12);Wt.block([4,3,.24],[0,1.5,12],"wall","unmed");Wt.solid(-2,2,11.88,12.12,"unmed");Wt.wallZ(-10,12,-9);Wt.wallZ(-10,12,9);const is=jl(1,9,0,8,mi),Tn=fu(1,9,8,10,"z",mi,0);Wt.block([8,mi,8],[5,mi/2,4],"wall2");const nd=4;for(let n=0;n<nd;n++){const t=mi*(n+1)/nd,e=10-.25-n*.5;Wt.block([8,t,.5],[5,t/2,e],"wall2")}Wt.solid(.88,1.12,0,10);Wt.block([.24,.9,10],[1,mi+.45,5],"chain");Wt.solid(1,9,-.12,.12);Wt.block([8,.9,.24],[5,mi+.45,0],"chain");Wt.block([2,.14,.12],[5,2.7,10.06],"glow");Wt.wallX(-9,-2,-10);Wt.wallX(2,9,-10);Wt.block([4,3,.24],[0,1.5,-10],"wall","unmed");Wt.solid(-2,2,-10.12,-9.88,"unmed");Wt.wallZ(-18,-10,-9);Wt.wallZ(-18,-10,9);Wt.wallX(-9,-1,-18);Wt.wallX(1,9,-18);Wt.wallZ(-20,-18,-1);Wt.wallZ(-20,-18,1);Wt.wallX(-1,1,-20);Wt.block([1.8,2.6,.06],[0,1.4,-19.8],"glow");const ra=uu(Wt,{doorId:"exitdoor",keypadId:"keypad11",code:KM,side:"n",wallAt:-18,along:0,keypadAlong:1.35,doorLabel:"the exit door",successToast:"2593. gravity was the last lock."}),id=Wt.colliders.filter(n=>n.states===void 0||n.states==="both");function sd(n,t){if(n>=Tn.minX&&n<=Tn.maxX&&t>=Tn.minZ&&t<=Tn.maxZ){const e=(t-Tn.minZ)/(Tn.maxZ-Tn.minZ);return Tn.yLow+(Tn.yHigh-Tn.yLow)*e}return n>=is.minX&&n<=is.maxX&&t>=is.minZ&&t<=is.maxZ?is.y:0}const xl={id:"room11",name:"the Treatment Corridor",floor:{minX:-9,maxX:9,minZ:-20,maxZ:22},spawn:{x:0,z:20,yaw:0},blocks:Wt.blocks,colliders:Wt.colliders,heightZones:[is],ramps:[Tn],scrawls:[Xt(`two doors ahead. one cabinet
between them. find it.`,"w",-9,17),Xt(`the hallway forgets
how long it's been`,"w",-9,20,{size:2.4}),Xt(`something keeps the low floor.
something else keeps the high one.`,"e",9,13,{size:2.6}),Xt(`the floor climbs on the east.
he never follows it up.`,"e",9,10.5,{size:2.6}),Xt("2 5 9 3","e",9,4,{y:mi+1.65,big:!0,proud:.1,id:"codeScrawl"}),Xt(`it opens for the calm.
not for you, yet.`,"n",-10,-5,{size:2.4}),Xt(`the last cabinet.
after this, it's just the door.`,"w",-9,-14,{size:2.4})],interactables:[kn({id:"dispenser11",side:"e",wallAt:9,along:17,label:"use the dispenser"}),kn({id:"dispenser11b",side:"e",wallAt:9,along:11,label:"use the dispenser"}),kn({id:"dispenser11c",side:"w",wallAt:-9,along:-14,label:"use the dispenser"}),ra.door,ra.keypad],lights:[{pos:[0,20]},{pos:[0,16]},{pos:[0,12]},{pos:[-7,8]},{pos:[-7,1]},{pos:[-7,-6]},{pos:[5,6]},{pos:[5,2]},{pos:[0,-10]},{pos:[0,-14]},{pos:[0,-17]}],exits:[{to:"room12",minX:-1,maxX:1,minZ:-19.9,maxZ:-18.8}]},jM=He([{x:-6,z:5},{x:-6,z:-3},{x:-8,z:-3},{x:-8,z:5}],Wt.colliders),JM=He([{x:2,z:1.2},{x:2,z:6.8}],Wt.colliders);function QM(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}const ty=(()=>{let n=null,t=null,e=!1;function i(r){r.state.forceState("lucid"),r.shiftFx(),r.teleportPlayer(xl.spawn.x,xl.spawn.z),r.hud.toast(`hands. a needle. "up or down, you're still mine," he says.`),ed(r)}function s(r){n==null||n.dispose(),t==null||t.dispose(),n=new fe(r.scene,jM,[],pe(r,{warnToast:"he is looking at you.",chaseToast:"run. or stop being visible.",onCaught:i}),{colliders:id,floorHeightAt:sd}),t=new fe(r.scene,JM,[],pe(r,{warnToast:"the one above sees you.",chaseToast:"nowhere to go but down.",onCaught:i}),{colliders:id,floorHeightAt:sd}),n.setWardState(r.state.state),t.setWardState(r.state.state)}return{onEnter(r){ed(r),s(r),e=!1,r.state.forceState("unmed"),r.shiftFx(),r.hud.toast("you come to mid-stride, raw. the calm hasn't caught up yet."),r.hud.setObjective("the treatment corridor climbs. carry enough for both gates — and both floors.")},isAvailable(r){return ra.isAvailable(r)},onInteract(r,o){return ra.handleInteract(r,o)},onStateChange(r,o){n==null||n.setWardState(r),t==null||t.setWardState(r),r==="unmed"&&!e&&(e=!0,o.hud.toast("something moves on the floor below. something else, above."))},update(r,o,l){if(!n||!t)return;const c=l.playerPos();n.update(r,c.x,c.z,l.state.state),t.update(r,c.x,c.z,l.state.state);const h=Math.hypot(n.x-c.x,n.z-c.z),d=Math.hypot(t.x-c.x,t.z-c.z),u=n.chasing||t.chasing,f=Math.max(n.watching,t.watching),g=Math.min(h,d);if(f>0||u){let _=n;(t.chasing&&!n.chasing||n.chasing===t.chasing&&(t.watching>n.watching||t.watching===n.watching&&d<h))&&(_=t);const m=QM(_.x-c.x,_.z-c.z,c.yaw);l.hud.setThreat(f,m)}else l.hud.setThreat(0,null);l.audio.setThreat(f,g,u)},onLeave(r){r.hud.setThreat(0,null),r.audio.setThreat(0,1/0,!1),n==null||n.dispose(),t==null||t.dispose(),n=null,t=null}}})(),ey="8563";let na=ey;function ad(n){yn()&&(na=Hn(),n.updateScrawlText("codeScrawlA",ln(na,[0,2])),n.updateScrawlText("codeScrawlB",ln(na,[2,4])))}const yt=new Re;yt.wallX(-10,10,46);yt.wallZ(36,46,-10);yt.wallZ(36,46,10);yt.wallX(-10,-2,36);yt.wallX(2,10,36);yt.block([4,3,.24],[0,1.5,36],"wall","unmed");yt.solid(-2,2,35.88,36.12,"unmed");yt.wallZ(20,36,-10);yt.wallZ(20,26,10);yt.wallZ(28,36,10);yt.wallX(10,12,26);yt.wallX(10,12,28);yt.wallZ(26,28,12);const ny={minX:10,maxX:12,minZ:26,maxZ:28};yt.block([.12,.14,2],[10,2.7,27],"glow");const Hs={minX:-3.5,maxX:-.5,minZ:26,maxZ:30};yt.block([3,1.8,4],[-2,.9,28],"wall2");yt.solid(Hs.minX,Hs.maxX,Hs.minZ,Hs.maxZ);yt.wallX(-10,-2,20);yt.wallX(2,10,20);yt.wallZ(-8,20,-10);yt.wallZ(-8,4,10);yt.wallZ(6,20,10);yt.wallX(10,12,4);yt.wallX(10,12,6);yt.wallZ(4,6,12);const rd={minX:10,maxX:12,minZ:4,maxZ:6};yt.block([.12,.14,2],[10,2.7,5],"glow");const as={minX:1,maxX:2,minZ:5,maxZ:7};yt.block([1,1.8,2],[1.5,.9,6],"wall2");yt.solid(as.minX,as.maxX,as.minZ,as.maxZ);const rs={minX:-9.3,maxX:-8.3,minZ:12,maxZ:14};yt.block([1,1.6,2],[-8.8,.8,13],"prop");yt.solid(rs.minX,rs.maxX,rs.minZ,rs.maxZ);yt.wallX(-10,-2,-8);yt.wallX(2,10,-8);yt.block([4,3,.24],[0,1.5,-8],"wall","unmed");yt.solid(-2,2,-8.12,-7.88,"unmed");yt.wallZ(-18,-8,-10);yt.wallZ(-18,-8,10);yt.wallX(-10,-2,-18);yt.wallX(2,10,-18);yt.wallZ(-26,-18,-10);yt.wallZ(-26,-18,10);yt.wallX(-10,-1,-26);yt.wallX(1,10,-26);yt.wallZ(-28,-26,-1);yt.wallZ(-28,-26,1);yt.wallX(-1,1,-28);yt.block([1.8,2.6,.06],[0,1.4,-27.8],"glow");const Ml={minX:-1,maxX:1,minZ:-26.13,maxZ:-25.87};yt.colliders.push(Ml);const po=yt.colliders.filter(n=>n.states===void 0||n.states==="both"),yl={id:"room12",name:"the Asylum Floor",floor:{minX:-10,maxX:12,minZ:-28,maxZ:46},spawn:{x:0,z:44,yaw:0},blocks:yt.blocks,colliders:yt.colliders,scrawls:[{text:`one cabinet past the first gate.
nothing after it. remember.`,size:2.8,pos:[-9.86,1.7,38],rotY:Math.PI/2},{text:`the whole floor breathes
the same stale air`,size:2.4,pos:[9.86,1.7,42],rotY:-Math.PI/2},{text:`the ward keeps half its mind
behind the east wall`,size:2.6,pos:[-9.86,1.7,28],rotY:Math.PI/2},{id:"codeScrawlA",text:"8 5 – –",size:2.2,pos:[11.86,1.7,27],rotY:-Math.PI/2,big:!0},{text:`the hall keeps two of them.
they never walk the same way twice.`,size:2.8,pos:[-9.86,1.7,10],rotY:Math.PI/2},{id:"codeScrawlB",text:"– – 6 3",size:2.2,pos:[11.86,1.7,5],rotY:-Math.PI/2,big:!0},{text:`the far door doesn't care
how you got here.`,size:2.6,pos:[-5,1.7,-7.86],rotY:0},{text:`the last cabinet.
after this, it's just the door.`,size:2.4,pos:[-9.86,1.7,-15],rotY:Math.PI/2}],interactables:[{id:"dispenser12a",type:"dispenser",size:[.16,.75,.55],pos:[-9.72,1.45,42],mat:"dispenser",states:"both",facing:"px",label:"use the dispenser"},{id:"dispenser12b",type:"dispenser",size:[.16,.75,.55],pos:[-9.72,1.45,-13],mat:"dispenser",states:"both",facing:"px",label:"use the dispenser"},{id:"dispenser12c",type:"dispenser",size:[.16,.75,.55],pos:[-9.72,1.45,35],mat:"dispenser",states:"both",facing:"px",label:"use the dispenser"},{id:"keypad12",type:"keypad",size:[.4,.5,.14],pos:[1.35,1.45,-25.75],mat:"pad",states:"both",facing:"pz",label:"use the keypad"},{id:"exitdoor",type:"door",size:[2,3,.2],pos:[0,1.5,-26],mat:"door",states:"both",facing:"pz",label:"the exit door"}],lights:[{pos:[0,44]},{pos:[-5,40]},{pos:[5,40]},{pos:[0,36]},{pos:[5,32]},{pos:[-5,32]},{pos:[5,27]},{pos:[-2,28]},{pos:[5,23]},{pos:[-5,23]},{pos:[0,17]},{pos:[-7,14]},{pos:[5,11]},{pos:[-3,8]},{pos:[5,5]},{pos:[0,0]},{pos:[5,-4]},{pos:[-5,-4]},{pos:[0,-13]},{pos:[0,-20]},{pos:[0,-23]},{pos:[0,-26]}],exits:[{to:"room13",minX:-1,maxX:1,minZ:-27.9,maxZ:-26.8}]},iy=[{x:-7,z:33.5},{x:-7,z:22.5},{x:3,z:22.5},{x:3,z:33.5}],sy=[{x:3,z:17.5},{x:3,z:-5.5},{x:-7.5,z:-5.5},{x:-7.5,z:17.5}],ay=[{x:0,z:11},{x:-5,z:11},{x:-5,z:1},{x:0,z:1}];function ry(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}const oy=(()=>{let n=null,t=null,e=null,i=!1,s=!1;function a(l){l.state.forceState("lucid"),l.shiftFx(),l.teleportPlayer(yl.spawn.x,yl.spawn.z),l.hud.toast('hands. a needle. "the whole floor, and you still tried," he says.'),ad(l)}function r(l){n==null||n.dispose(),t==null||t.dispose(),e==null||e.dispose(),n=new fe(l.scene,sy,[rd,as,rs],pe(l,{warnToast:"he sees you.",chaseToast:"run. or stop being visible.",onCaught:a}),{colliders:po}),t=new fe(l.scene,ay,[rd,as,rs],pe(l,{warnToast:"so does the other one.",chaseToast:"run. or stop being visible.",onCaught:a}),{colliders:po,eyeTint:16757575}),e=new fe(l.scene,iy,[Hs,ny],pe(l,{warnToast:"he's alone with you now.",chaseToast:"run. or stop being visible.",onCaught:a}),{colliders:po}),n.setWardState(l.state.state),t.setWardState(l.state.state),e.setWardState(l.state.state)}return{onEnter(l){ad(l),r(l),i=!1,s=!1,l.state.forceState("unmed"),l.shiftFx(),l.hud.toast("the floor swims into focus. still raw."),l.hud.setObjective("the asylum floor. the last of it. two of them share the big hall; a third keeps his own room. one cabinet waits just past the first gate — after that, it's a long dry stretch to the far side.")},isAvailable(l){return l==="exitdoor"?!1:l==="keypad12"?!i:!0},onInteract(l,c){return l==="keypad12"?c.state.state==="unmed"?(c.hud.toast("the keypad is a smear of static. you can't read it like this."),!0):(c.telemetry.event("keypad_open"),c.releasePointerLock(),ei({code:na,onDenied:()=>c.telemetry.event("keypad_denied"),onSuccess:()=>{i=!0,c.telemetry.event("keypad_success"),c.moveInteractable("exitdoor",[-1,1.5,-26.85],Math.PI/2),Ml.minX=999,Ml.maxX=999.2,c.hud.toast(`${na}. the floor lets you go.`),c.hud.setObjective("the door is open. go."),c.telemetry.event("door_opened")},onClose:()=>{}}),!0):!1},onStateChange(l,c){n==null||n.setWardState(l),t==null||t.setWardState(l),e==null||e.setWardState(l),l==="unmed"&&!s&&(s=!0,c.hud.toast("three shapes, and none of them are yours."))},update(l,c,h){if(!n||!t||!e)return;const d=h.playerPos();n.update(l,d.x,d.z,h.state.state),t.update(l,d.x,d.z,h.state.state),e.update(l,d.x,d.z,h.state.state);const u=[n,t,e],f=u.map(p=>Math.hypot(p.x-d.x,p.z-d.z)),g=Math.max(...u.map(p=>p.watching)),_=Math.min(...f),m=u.some(p=>p.chasing);if(g>0||m){let p=u[0],S=f[0];for(let b=1;b<u.length;b++){const C=u[b],E=f[b];(C.chasing&&!p.chasing||C.chasing===p.chasing&&(C.watching>p.watching||C.watching===p.watching&&E<S))&&(p=C,S=E)}const y=ry(p.x-d.x,p.z-d.z,d.yaw);h.hud.setThreat(g,y)}else h.hud.setThreat(0,null);h.audio.setThreat(g,_,m)},onLeave(l){l.hud.setThreat(0,null),l.audio.setThreat(0,1/0,!1),n==null||n.dispose(),t==null||t.dispose(),e==null||e.dispose(),n=null,t=null,e=null}}})(),vn=Bt.lastWard,an=4,pa=-24,ma=16,ly=ma-pa,od=(pa+ma)/2,Za={x:0,z:18},tn=new Re;tn.wallX(-an,an,22);tn.wallZ(-32,22,-an);tn.wallZ(-32,22,an);tn.wallX(-an,-1,-30);tn.wallX(1,an,-30);tn.wallZ(-32,-30,-1);tn.wallZ(-32,-30,1);tn.wallX(-1,1,-32);tn.block([1.8,2.6,.06],[0,1.4,-31.8],"glow");const Ql={minX:vn.startGapM/2,maxX:an,minZ:pa,maxZ:ma},tc={minX:-an,maxX:-5/2,minZ:pa,maxZ:ma};tn.colliders.push(Ql,tc);const ld=tn.colliders.filter(n=>n!==Ql&&n!==tc&&(n.states===void 0||n.states==="both")),cy={id:"room13",name:"the Last Ward",floor:{minX:-an,maxX:an,minZ:-32,maxZ:22},spawn:{x:0,z:20,yaw:0},blocks:tn.blocks,colliders:tn.colliders,scrawls:[Xt(`the last hallway.
nothing left to take.`,"w",-an,19,{size:2.6}),Xt(`the calm makes it smaller.
the raw makes it watched.`,"e",an,19,{size:2.8,big:!0}),Xt(`it lets you out.
it just wanted to see you choose.`,"w",-an,-27,{size:2.4})],interactables:[],lights:[{pos:[0,20]},{pos:[0,16]},{pos:[0,10]},{pos:[0,4]},{pos:[0,-2]},{pos:[0,-8]},{pos:[0,-14]},{pos:[0,-20]},{pos:[0,-24]},{pos:[0,-26]},{pos:[0,-29]}],exits:[{to:"room14",minX:-1,maxX:1,minZ:-31.9,maxZ:-30.8}]},hy=He([{x:1.5,z:-22},{x:1.5,z:14},{x:-1.5,z:14},{x:-1.5,z:-22}],tn.colliders),dy=He([{x:-1.5,z:14},{x:-1.5,z:-22},{x:1.5,z:-22},{x:1.5,z:14}],tn.colliders);function uy(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}const fy=(()=>{let n=null,t=null,e=!1,i=!1,s=0,a=vn.startGapM/2,r=null,o=null,l=null;function c(p){a=p,Ql.minX=a,tc.maxX=-a;const S=an-a,y=a+S/2;r&&(r.scale.x=S,r.position.x=y),o&&(o.scale.x=S,o.position.x=-y)}function h(){s=0,i=!1,c(vn.startGapM/2)}function d(p){l=new $s({color:7830904,roughness:.95,metalness:0});const S=new ae(1,3,ly);r=new xt(S,l),o=new xt(S,l),r.position.set(0,1.5,od),o.position.set(0,1.5,od),p.scene.add(r),p.scene.add(o)}function u(p){for(const S of[r,o])S&&p.scene.remove(S);r==null||r.geometry.dispose(),l==null||l.dispose(),r=null,o=null,l=null}function f(p){p.state.forceState("lucid"),p.shiftFx(),p.teleportPlayer(Za.x,Za.z),h(),p.hud.toast('hands. a needle. "there was never a safe way," he says.')}function g(p){p.state.forceState("lucid"),p.shiftFx(),p.teleportPlayer(Za.x,Za.z),h(),p.hud.toast("the corridor closes like a throat. it starts you over, calm."),p.telemetry.event("wall_crushed")}function _(p){n==null||n.dispose(),t==null||t.dispose(),n=new fe(p.scene,hy,[],pe(p,{warnToast:"he is looking at you.",chaseToast:"run. or stop being visible.",onCaught:f}),{colliders:ld,sightRange:vn.orderlySightRangeM,coneDeg:vn.orderlyConeDeg}),t=new fe(p.scene,dy,[],pe(p,{warnToast:"the other one sees you too.",chaseToast:"run. or stop being visible.",onCaught:f}),{colliders:ld,sightRange:vn.orderlySightRangeM,coneDeg:vn.orderlyConeDeg,eyeTint:16757575}),n.setWardState(p.state.state),t.setWardState(p.state.state)}return{onEnter(p){_(p),d(p),h(),e=!1,p.state.forceState("lucid"),p.shiftFx(),p.hud.toast("you're calm. it decided that for you."),p.hud.setObjective("the last ward. one corridor between you and out. neither state will carry you the whole way.")},onStateChange(p,S){n==null||n.setWardState(p),t==null||t.setWardState(p),p==="unmed"&&!e&&(e=!0,S.hud.toast("two of them keep it. they never rest at the same end."))},update(p,S,y){const b=y.playerPos(),C=b.z>pa&&b.z<ma;if(C&&y.state.state==="lucid"){i||(i=!0,y.hud.toast("the walls heard the calm. they're coming to meet it."),y.telemetry.event("walls_closing")),c(Math.max(vn.minGapM/2,a-vn.closePerSideMps*p));const R=a*2;if(R<=vn.minGapM){g(y);return}else s<2&&R<=vn.tightGapM?(s=2,y.hud.toast("it will not fit you much longer.")):s<1&&R<=vn.warnGapM&&(s=1,y.hud.toast("narrower than it was. it remembers."))}if(C){const R=a-Bt.player.radius;b.x>R?(y.teleportPlayer(R,b.z),b.x=R):b.x<-R&&(y.teleportPlayer(-R,b.z),b.x=-R)}if(!n||!t)return;n.update(p,b.x,b.z,y.state.state),t.update(p,b.x,b.z,y.state.state);const E=Math.hypot(n.x-b.x,n.z-b.z),T=Math.hypot(t.x-b.x,t.z-b.z),L=n.chasing||t.chasing,w=Math.max(n.watching,t.watching),x=Math.min(E,T);if(w>0||L){let R=n;(t.chasing&&!n.chasing||n.chasing===t.chasing&&(t.watching>n.watching||t.watching===n.watching&&T<E))&&(R=t);const O=uy(R.x-b.x,R.z-b.z,b.yaw);y.hud.setThreat(w,O)}else y.hud.setThreat(0,null);y.audio.setThreat(w,x,L)},onLeave(p){p.hud.setThreat(0,null),p.audio.setThreat(0,1/0,!1),n==null||n.dispose(),t==null||t.dispose(),n=null,t=null,u(p)}}})(),en=new Re;en.wallX(-5,5,9);en.wallZ(-17,9,-5);en.wallZ(-17,9,5);en.wallX(-5,5,-17);en.wallX(-5,-1,-14);en.wallX(1,5,-14);const Ci={minX:-1,maxX:1,minZ:-14.1,maxZ:-13.9};en.colliders.push(Ci);const ec=Kl({id:"plate14",minX:-1.3,maxX:1.3,minZ:-12.5,maxZ:-11.3});en.blocks.push(ec.block);const Gs={minX:2.55,maxX:3.45,minZ:-13.3,maxZ:-12.7};en.block([.9,1,.6],[3,.5,-13],"prop");en.solid(Gs.minX,Gs.maxX,Gs.minZ,Gs.maxZ);en.block([1.8,2.6,.06],[0,1.4,-16.8],"glow");const py={id:"vestibule14",minX:-5,maxX:5,minZ:-16,maxZ:-14.2},my=en.colliders.filter(n=>n.states===void 0||n.states==="both"),gy=He([{x:-4.2,z:-11.9},{x:4.2,z:-11.9}],en.colliders),Sl={id:"room14",name:"the Hold",floor:{minX:-5,maxX:5,minZ:-17,maxZ:9},spawn:{x:0,z:8,yaw:0},blocks:en.blocks,colliders:en.colliders,scrawls:[Xt(`it only holds the door
while it's heavy.`,"w",-5,2),Xt(`he never stopped walking.
you just stopped seeing him.`,"e",5,-2)],interactables:[kn({id:"dispenser14",side:"w",wallAt:-5,along:7.3,label:"use the dispenser"}),{id:"gate14",type:"door",size:[2,3,.2],pos:[0,1.5,-14],mat:"door",states:"both",facing:"pz",label:"the gate"}],lights:[{pos:[0,6]},{pos:[0,1]},{pos:[0,-4]},{pos:[3,-12]},{pos:[-3,-12]},{pos:[0,-15.5]}],triggers:[ec.trigger,py],exits:[{to:"room15",minX:-1,maxX:1,minZ:-16.9,maxZ:-16.2}]},_y=[0,1.5,-14],vy=[-1,1.5,-14.85],xy=.7;function My(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}const yy=(()=>{let n=null,t=!1,e=0,i=0,s=!1,a=!1,r=!1,o=!1;function l(f,g){s||(s=!0,Ci.minX=999,Ci.maxX=999.2,f.moveInteractable("gate14",vy,Math.PI/2),a?g&&!r&&(r=!0,f.hud.toast("he just did what you couldn't do alone.")):(a=!0,f.hud.toast("the floor remembers weight. the door remembers the floor.")),f.telemetry.event("gate_open",{byOrderly:g}))}function c(f){const g=f.playerPos(),_=!(g.x>-1.35&&g.x<1.35&&g.z>-14.3&&g.z<-13.7),m=!n||!(n.x>-1.35&&n.x<1.35&&n.z>-14.3&&n.z<-13.7);!_||!m||(s=!1,Ci.minX=-1,Ci.maxX=1,f.moveInteractable("gate14",_y,0),f.telemetry.event("gate_close"))}function h(f,g){e+=1,e===1&&l(f,g)}function d(){e=Math.max(0,e-1),e===0&&(i=xy)}return{onEnter(f){n==null||n.dispose(),n=new fe(f.scene,gy,[Gs],pe(f,{warnToast:"he is looking at you.",chaseToast:"run. or stop being visible.",onCaught:()=>{f.state.forceState("lucid"),f.shiftFx(),f.teleportPlayer(Sl.spawn.x,Sl.spawn.z),f.hud.toast('hands. a needle. "back to the start of the wing," he says.')}}),{colliders:my}),n.setWardState(f.state.state),t=!1,e=0,i=0,s=!1,a=!1,r=!1,o=!1,Ci.minX=-1,Ci.maxX=1,f.hud.setObjective("the wing goes on. so does he.")},isAvailable(f){return f!=="gate14"},onTriggerEnter(f,g){f==="plate14"&&h(g,!1),f==="vestibule14"&&!o&&(o=!0,g.hud.setObjective("through. it doesn't get gentler from here."))},onTriggerExit(f){f==="plate14"&&d()},onStateChange(f){n==null||n.setWardState(f)},update(f,g,_){if(!n)return;const m=_.playerPos();n.update(f,m.x,m.z,_.state.state);const p=fr(ec.trigger,n.x,n.z,_.state.state);p&&!t&&h(_,!0),!p&&t&&d(),t=p,s&&e===0&&(i-=f,i<=0&&c(_));const S=n.watching,y=Math.hypot(n.x-m.x,n.z-m.z);S>0||n.chasing?_.hud.setThreat(S,My(n.x-m.x,n.z-m.z,m.yaw)):_.hud.setThreat(0,null),_.audio.setThreat(S,y,n.chasing)},onLeave(f){f.hud.setThreat(0,null),f.audio.setThreat(0,1/0,!1),n==null||n.dispose(),n=null}}})(),Ft=new Re;Ft.wallX(-9,9,6);Ft.wallZ(-27,-18.8,-9);Ft.wallZ(-17.2,-3.4,-9);Ft.wallZ(-1.8,6,-9);Ft.wallZ(-27,-10.8,9);Ft.wallZ(-9.2,6,9);Ft.wallX(-9,-1,-27);Ft.wallX(1,9,-27);Ft.wallZ(-29,-27,-1);Ft.wallZ(-29,-27,1);Ft.wallX(-1,1,-29);Ft.block([1.8,2.6,.06],[0,1.4,-28.8],"glow");Ft.wallX(-10.8,-9,-3.4);Ft.wallX(-9.4,-9,-1.8);Ft.wallZ(-3.4,0,-10.8);Ft.wallZ(-1.8,0,-9.4);Ft.wallX(-10.8,-9.4,0);Ft.block([.12,.14,1.6],[-9,2.7,-2.6],"glow");const Sy={minX:-10.8,maxX:-9.4,minZ:-1.8,maxZ:0};Ft.wallX(9,9.4,-10.8);Ft.wallX(9,10.8,-9.2);Ft.wallZ(-12.6,-9.2,10.8);Ft.wallZ(-12.6,-10.8,9.4);Ft.wallX(9.4,10.8,-12.6);Ft.block([.12,.14,1.6],[9,2.7,-10],"glow");const wy={minX:9.4,maxX:10.8,minZ:-12.6,maxZ:-10.8};Ft.wallX(-10.8,-9,-17.2);Ft.wallX(-9.4,-9,-18.8);Ft.wallZ(-20.6,-17.2,-10.8);Ft.wallZ(-20.6,-18.8,-9.4);Ft.wallX(-10.8,-9.4,-20.6);Ft.block([.12,.14,1.6],[-9,2.7,-18],"glow");const by={minX:-10.8,maxX:-9.4,minZ:-20.6,maxZ:-18.8},mo=[Sy,wy,by],os=Kx(Ft,{doorId:"exitdoor",side:"n",wallAt:-27,along:0,doorLabel:"the exit door",lockId:"shape_lock15",lockAlong:1.35,lockLabel:"use the lock",allowUnmed:!0,keys:[{id:"shapeKeyA",shape:"circle",color:"#3fa9dd",pos:[-10.5,.9,-.3],pickupToast:"a circle. cold in your hand."},{id:"shapeKeyB",shape:"square",color:"#4caf6a",pos:[10.5,.9,-12.3],pickupToast:"a square. he didn't turn around."},{id:"shapeKeyC",shape:"triangle",color:"#c1170f",pos:[-10.5,.9,-20.3],pickupToast:"a triangle. you're already moving before you feel it."}],iconPanelId:"doorIcons15",iconPanelSide:"n",iconPanelWallAt:-27,iconPanelAlong:0,refusalToastIncomplete:(n,t)=>`it wants ${t} shapes back. you have ${n}.`,successToast:"three shapes, three small thefts. the door remembers none of it.",successObjective:"the door is open. go."}),go=Ft.colliders.filter(n=>n.states===void 0||n.states==="both"),Ey=He([{x:-6,z:-10},{x:7.2,z:-10},{x:7.2,z:-6.5},{x:-6,z:-6.5}],Ft.colliders),Ty=He([{x:1.5,z:-18},{x:-7.6,z:-18},{x:-7.6,z:-14.4},{x:1.5,z:-14.4}],Ft.colliders),Ay=He([{x:7.5,z:.5},{x:-7.5,z:.5},{x:-7.5,z:-6},{x:7.5,z:-6}],Ft.colliders),Cy=He([{x:-7.5,z:-10.5},{x:-7.5,z:-14},{x:7.5,z:-14},{x:7.5,z:-10.5}],Ft.colliders),Ry=He([{x:7.5,z:-25.5},{x:7.5,z:-18.5},{x:-7.5,z:-18.5},{x:-7.5,z:-25.5}],Ft.colliders),wl={id:"room15",name:"the Sorting Room",floor:{minX:-9,maxX:9,minZ:-29,maxZ:6},spawn:{x:0,z:5,yaw:0},blocks:Ft.blocks,colliders:Ft.colliders,scrawls:[Xt(`no medicine here. only what
you carried in.`,"w",-9,4),Xt(`something small waits
where the wall turns`,"e",9,-2),Xt(`he walks past it
more than he watches it`,"w",-9,-10),Xt(`the corner is the only
part of you it can't own`,"e",9,-18),Xt(`every one you take,
another of them arrives`,"n",-27,-3.5)],interactables:[os.door,os.lock,...os.keys],iconPanels:[os.iconPanel],lights:[{pos:[0,4]},{pos:[0,0]},{pos:[-6,-2.5]},{pos:[6,-2.5]},{pos:[0,-6.5]},{pos:[-4,-10]},{pos:[6,-10]},{pos:[0,-14]},{pos:[-4,-14.5]},{pos:[4,-18]},{pos:[-4,-18.5]},{pos:[0,-22]},{pos:[0,-25.5]}],exits:[{to:"room16",minX:-1,maxX:1,minZ:-28.9,maxZ:-27.1}]},Py=[{waypoints:Ay,eyeTint:12159743,onWarnToast:"and now a third.",spawnToast:"somewhere, a door you can't see opens."},{waypoints:Cy,eyeTint:16740312,onWarnToast:"four, and closing.",spawnToast:"they know what you took."},{waypoints:Ry,eyeTint:8382719,onWarnToast:"five. all of them, all at once.",spawnToast:"the last of them. now it is just you and the door."}],Ly=new Set(["shapeKeyA","shapeKeyB","shapeKeyC"]);function Iy(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}const Dy=(()=>{let n=null,t=null,e=[],i=new Set;function s(){const c=[];return n&&c.push(n),t&&c.push(t),c.concat(e)}function a(c){c.state.forceState("lucid"),c.shiftFx(),c.teleportPlayer(wl.spawn.x,wl.spawn.z),c.hud.toast(`hands. a needle. "you dropped something," he says — you didn't.`)}function r(c){n==null||n.dispose(),t==null||t.dispose(),n=new fe(c.scene,Ey,mo,pe(c,{warnToast:"he sees you.",chaseToast:"run. or stop being visible.",onCaught:a}),{colliders:go}),t=new fe(c.scene,Ty,mo,pe(c,{warnToast:"so does he.",chaseToast:"run. or stop being visible.",onCaught:a}),{colliders:go,eyeTint:16757575}),n.setWardState(c.state.state),t.setWardState(c.state.state)}function o(c){const h=Py[e.length];if(!h)return;const d=new fe(c.scene,h.waypoints,mo,pe(c,{warnToast:h.onWarnToast,chaseToast:"run. or stop being visible.",onCaught:a}),{colliders:go,eyeTint:h.eyeTint});d.setWardState(c.state.state),e.push(d),c.hud.toast(h.spawnToast),c.telemetry.event("orderly_escalation",{count:s().length})}return{onEnter(c){r(c),e=[],i=new Set,c.state.forceState("unmed"),c.shiftFx(),c.hud.toast("raw, and staying that way. there's nothing left to dose you with."),c.hud.setObjective("three shapes. no medicine here. every one you take, another of them arrives.")},isAvailable(c){return os.isAvailable(c)},onInteract(c,h){const d=os.handleInteract(c,h);return d&&Ly.has(c)&&!i.has(c)&&(i.add(c),o(h)),d},onStateChange(c){for(const h of s())h.setWardState(c)},update(c,h,d){const u=s();if(u.length===0)return;const f=d.playerPos();for(const S of u)S.update(c,f.x,f.z,d.state.state);const g=u.map(S=>Math.hypot(S.x-f.x,S.z-f.z)),_=Math.max(...u.map(S=>S.watching)),m=Math.min(...g),p=u.some(S=>S.chasing);if(_>0||p){let S=u[0],y=g[0];for(let C=1;C<u.length;C++){const E=u[C],T=g[C];(E.chasing&&!S.chasing||E.chasing===S.chasing&&(E.watching>S.watching||E.watching===S.watching&&T<y))&&(S=E,y=T)}const b=Iy(S.x-f.x,S.z-f.z,f.yaw);d.hud.setThreat(_,b)}else d.hud.setThreat(0,null);d.audio.setThreat(_,m,p)},onLeave(c){c.hud.setThreat(0,null),c.audio.setThreat(0,1/0,!1),n==null||n.dispose(),t==null||t.dispose();for(const h of e)h.dispose();n=null,t=null,e=[]}}})(),Yt=new Re;Yt.wallX(-8,8,6);Yt.wallZ(2,6,-8);Yt.wallZ(2,6,8);Yt.wallX(-8,-1,2);Yt.wallX(1,8,2);Yt.wallZ(-6.9,2,-8);Yt.wallZ(-14,-8.5,-8);Yt.wallZ(-3.2,2,8);Yt.wallZ(-14,-4.8,8);Yt.wallX(-9.6,-8,-8.5);Yt.wallX(-9.6,-8,-6.9);Yt.wallZ(-8.5,-6.9,-9.6);const mu={minX:-9.6,maxX:-8,minZ:-8.5,maxZ:-6.9};Yt.wallX(8,9.6,-4.8);Yt.wallX(8,9.6,-3.2);Yt.wallZ(-4.8,-3.2,9.6);const gu={minX:8,maxX:9.6,minZ:-4.8,maxZ:-3.2};Yt.blocks.push({size:[.12,.14,1.6],pos:[-8,2.7,-7.7],mat:"glow",lightState:"lit"});Yt.blocks.push({size:[.12,.14,1.6],pos:[8,2.7,-4],mat:"glow",lightState:"lit"});Yt.blocks.push({size:[.4,.04,.4],pos:[7,.02,-4],mat:"phosphor",lightState:"dark"});Yt.blocks.push({size:[.4,.04,.4],pos:[3,.02,-2],mat:"phosphor",lightState:"dark"});Yt.blocks.push({size:[.4,.04,.4],pos:[-2,.02,0],mat:"phosphor",lightState:"dark"});Yt.blocks.push({size:[.4,.04,.4],pos:[-5,.02,-3],mat:"phosphor",lightState:"dark"});Yt.blocks.push({size:[.4,.04,.4],pos:[-7,.02,-6.5],mat:"phosphor",lightState:"dark"});Yt.wallX(-8,-1,-14);Yt.wallX(1,8,-14);const Xs={minX:-1,maxX:1,minZ:-14.1,maxZ:-13.9};Yt.colliders.push(Xs);Yt.wallZ(-16,-14,-1);Yt.wallZ(-16,-14,1);Yt.wallX(-1,1,-16);Yt.block([1.8,2.6,.06],[0,1.4,-15.9],"glow");const Uy=He([{x:5,z:.5},{x:5,z:-13},{x:-5,z:-13},{x:-5,z:.5}],Yt.colliders),_u={id:"room16",name:"the Breaker Bay",floor:{minX:-9.6,maxX:9.6,minZ:-16,maxZ:6},spawn:{x:0,z:5,yaw:0},blocks:Yt.blocks,colliders:Yt.colliders,scrawls:[Xt(`they never turn the lights off.
someone must be afraid of the dark too.`,"e",8,0,{size:2.8}),Xt(`the breaker's in the east nook.
it takes steady, medicated hands —
and a room that's held the light a while.`,"w",-9.6,-8.2,{size:2.4,id:"inkScrawl16"}),{...Xt(`the door only opens
for calm eyes in the dark.`,"w",-9.6,-7.2,{size:2.4,id:"phosphorScrawl16"}),lightState:"dark",ink:"phosphor"}],interactables:[kn({id:"dispenser16a",side:"w",wallAt:-8,along:4,label:"use the dispenser"}),nl({id:"lightSwitch16",side:"e",wallAt:9.6,along:-4,label:"the breaker switch"}),{id:"exitdoor16",type:"door",size:[2,3,.2],pos:[0,1.5,-14],mat:"door",states:"both",facing:"pz",label:"the exit door"}],lights:[{pos:[0,4]},{pos:[0,0]},{pos:[-3,-4]},{pos:[3,-8]},{pos:[-3,-11]},{pos:[0,-15]}],exits:[{to:"room17",minX:-1,maxX:1,minZ:-15.9,maxZ:-14.9}]},Ny=[0,1.5,-14],Oy=[-1,1.5,-14.85],Fy=18,zy=26,ky=2,By=-14,Hy=.15;function cd(n,t,e){return n>=e.minX&&n<=e.maxX&&t>=e.minZ&&t<=e.maxZ}function Gy(n,t){return!(t>=ky||t<=By||cd(n,t,mu)||cd(n,t,gu))}const Xy=(()=>{let n=!1,t=!1,e=0,i=0,s=0,a=!1,r=!1,o=!1,l=!1;function c(d){e=0,i=0,s=0,a=!1,r=!1,o=!1,l=!1,d.setGlowFade(1)}return Jl({orderlies:[{waypoints:Uy,occluders:[mu,gu]}],colliders:Yt.colliders,spawn:_u.spawn,onEnterObjective:"the wing keeps its lights on for a reason. find out what it's hiding it from.",catchToast:'hands. a needle. "lights out," he says.',unmedToast:"something throws a shadow that keeps his shape, even with the lights out.",extraScript:{onEnter(d){n=!1,t=!1,Xs.minX=-1,Xs.maxX=1,d.moveInteractable("exitdoor16",Ny,0),c(d)},update(d,u,f){if(!n){const m=f.playerPos();e<1&&Gy(m.x,m.z)&&(e===0&&!a&&(a=!0,f.hud.toast("the room feeds the paint. give it time.")),e=Math.min(1,e+d/Fy),e>=1&&!r&&(r=!0,f.hud.toast("the floor's drunk all the light it can hold.")));return}s+=d;const g=Math.max(.001,i*zy),_=Math.max(0,1-s/g);f.setGlowFade(_),!(i<Hy)&&(_<=.3&&!o&&(o=!0,f.hud.toast("the paint drinks the light. it forgets fast.")),_<=0&&!l&&(l=!0,f.hud.toast("the dark just took the last of it back.")))},onInteract(d,u){return d==="lightSwitch16"?u.state.state==="unmed"?(u.hud.toast("cold iron. it won't answer to raw hands."),!0):(n=!n,u.setRoomDark(n),u.telemetry.event("light_switch",{dark:n,charge:e}),n?(i=e,s=0,o=!1,l=!1,u.setGlowFade(1),u.hud.toast(i>=.8?"the hum dies. the paint answers back, fat and green.":i>=.35?"the hum dies. the paint's thin — it won't hold long.":"the hum dies. the paint barely stirs. it won't hold this dark at all.")):u.hud.toast("fluorescents stutter, then hold. it's too bright in here now."),!0):d==="exitdoor16"?t?!0:u.state.state==="unmed"?(u.hud.toast("you press against it. nothing. it isn't yours to open like this."),!0):u.isRoomDark()?(t=!0,Xs.minX=999,Xs.maxX=999.2,u.moveInteractable("exitdoor16",Oy,Math.PI/2),u.telemetry.event("door_opened"),u.hud.toast("cold steel gives way in the dark. calm hands, calm eyes."),u.hud.setObjective("the dark kept its half of the bargain. so did you."),!0):(u.hud.toast("a flare of white. your hand finds nothing to hold onto."),!0):!1},onCaught(d){n=!1,d.setRoomDark(!1),c(d)}}})})(),hd="9137",Tr=0,Bn=3.4,Fi=6,ga=.24,dd=ga/2;function ud(n){if(!yn())return;const t=Hn();oa.setCode(t,`${t}. two floors, one lock.`),n.updateScrawlText("codeScrawl",ln(t))}const ie=new Re;function Ar(n,t,e){ie.block([t-n,Fi-3,ga],[(n+t)/2,(3+Fi)/2,e],"wall2")}function vu(n,t,e){ie.block([ga,Fi-3,t-n],[e,(3+Fi)/2,(n+t)/2],"wall2")}ie.wallX(-9,9,34);ie.wallZ(-8,34,-9);ie.wallZ(-8,34,9);vu(-8,34,-9);vu(-8,34,9);Ar(-9,9,34);ie.wallX(-9,-1,-6);ie.wallX(1,9,-6);Ar(-9,9,-6);ie.wallZ(-8,-6,-1);ie.wallZ(-8,-6,1);ie.wallX(-1,1,-8);ie.block([1.8,2.6,.06],[0,1.4,-7.82],"glow");ie.wallX(-9,6,16);ie.wallX(8,9,16);Ar(-9,6,16);Ar(8,9,16);function xu(n,t,e){ie.block([ga,Fi,t-n],[e,Fi/2,(n+t)/2],"wall2"),ie.colliders.push({minX:e-dd,maxX:e+dd,minZ:n,maxZ:t})}xu(10,16,6);xu(10,16,8);const Mu=pu("stairEast",6,8,10,16,"z",Bn,"balcony",Tr,"ground"),yu=pu("stairWest",-8,-6,4,8,"z",Bn,"balcony",Tr,"ground"),fd=6;for(let n=0;n<fd;n++){const t=Bn*(n+1)/fd,e=16-n-.5;ie.block([2,t,1],[7,t/2,e],"wall2")}const pd=5;for(let n=0;n<pd;n++){const t=Bn*(n+1)/pd,e=8-n*.8-.4;ie.block([2,t,.8],[-7,t/2,e],"wall2")}const Vy=Bn,Su=.3,Wy=Vy-Su/2;function Cr(n,t,e,i){ie.block([t-n,Su,i-e],[(n+t)/2,Wy,(e+i)/2],"wall2")}Cr(-9,-8,-6,10);Cr(-6,9,-6,10);Cr(-8,-6,-6,4);Cr(-8,-6,8,10);const Zy=jl(-9,9,-6,10,Bn);function nc(n,t,e){ie.block([t-n,.9,ga],[(n+t)/2,Bn+.45,e],"chain")}ie.colliders.push({minX:-9,maxX:6,minZ:9.88,maxZ:10.12,level:"balcony"});ie.colliders.push({minX:8,maxX:9,minZ:9.88,maxZ:10.12,level:"balcony"});nc(-9,6,10);nc(8,9,10);ie.colliders.push({minX:-1,maxX:1,minZ:-6.12,maxZ:-5.88,level:"balcony"});nc(-1,1,-6);ie.colliders.push({minX:6.6,maxX:8,minZ:9.1,maxZ:9.4,level:"ground"});const oa=uu(ie,{doorId:"exitdoor",keypadId:"keypad17",code:hd,side:"n",wallAt:-6,along:0,keypadAlong:1.35,doorLabel:"the exit door",successToast:`${hd}. two floors, one lock.`,successObjective:"the door is open. go."}),wu=ie.colliders.filter(n=>n.level===void 0||n.level==="ground"),Yy=ie.colliders.filter(n=>n.level===void 0||n.level==="balcony");function ia(n,t){return{...n,level:t}}const qy=[ia(Xt(`the last door
remembers this:`,"n",-6,-1.6,{size:2.4}),"ground"),ia(Xt("9 1 3 7","n",-6,1.6,{big:!0,id:"codeScrawl"}),"ground")],$y={id:"room17",name:"the Gallery Ward",floor:{minX:-9,maxX:9,minZ:-8,maxZ:34},spawn:{x:0,z:32,yaw:0,level:"ground"},ceilingY:Fi,levels:[Zh("ground",Tr,{minX:-9,maxX:9,minZ:-8,maxZ:34}),Zh("balcony",Bn,{minX:-9,maxX:9,minZ:-6,maxZ:10},{heightZones:[Zy]})],stairwells:[Mu,yu],blocks:ie.blocks,colliders:ie.colliders,scrawls:[ia(Xt(`they raised the roof
so no one has to share a floor`,"e",9,24,{size:2.6}),"ground"),ia(Xt(`the stairs are the only door
that opens both ways`,"w",-9,22,{size:2.6}),"ground"),ia(Xt(`his floor creaks the same beat, every lap.
seven strides north, he turns.`,"w",-9,3.5,{y:Bn+1.65,size:2.8}),"balcony"),...qy],interactables:[kn({id:"dispenser17a",side:"e",wallAt:9,along:31,label:"use the dispenser"}),{...kn({id:"dispenser17c",side:"w",wallAt:-9,along:9,label:"use the dispenser"}),level:"ground"},oa.door,oa.keypad],lights:[{pos:[0,32]},{pos:[0,26]},{pos:[0,20]},{pos:[7,13]},{pos:[4,4]},{pos:[-4,0]},{pos:[-6,6]},{pos:[0,-3]},{pos:[4,6]},{pos:[-2,-2]}],exits:[{to:"room18",minX:-1,maxX:1,minZ:-7.9,maxZ:-6.8}]};function md(n,t){for(const e of[Mu,yu]){if(n<e.minX||n>e.maxX||t<e.minZ||t>e.maxZ)continue;const i=e.axis==="x"?(n-e.minX)/(e.maxX-e.minX):(t-e.minZ)/(e.maxZ-e.minZ);return e.yLow+(e.yHigh-e.yLow)*i}return Tr}const Ky=He([{x:5,z:25},{x:5,z:18},{x:-5,z:18},{x:-5,z:25}],wu),jy=He([{x:6,z:8},{x:6,z:-4},{x:2,z:-4},{x:2,z:8}],Yy),Jy=He([{x:6,z:9},{x:6,z:3},{x:0,z:3},{x:0,z:9}],wu),Qy=Jl({orderlies:[{waypoints:Ky,occluders:[],level:"ground",floorHeightAt:md,onWarnToast:"the one in the hall sees you.",onChaseToast:"run. or stop being visible.",onCaughtToast:'hands. a needle. "not even past the stairs," he says.'},{waypoints:jy,occluders:[],level:"balcony",floorHeightAt:()=>Bn,onWarnToast:"the one on the gallery sees you.",onChaseToast:"nowhere up here but the way you came.",onCaughtToast:`hands. a needle. "the floor's not for guests," he says.`},{waypoints:Jy,occluders:[],level:"ground",floorHeightAt:md,onWarnToast:"the one below the gallery sees you.",onChaseToast:"run. or stop being visible.",onCaughtToast:`hands. a needle. "back where the light doesn't reach," he says.`}],colliders:ie.colliders,spawn:{x:0,z:32,level:"ground"},onEnterObjective:"the day room stacks itself. climb before you can cross.",unmedToast:"three of them keep this ward. none of them use the stairs the way you do.",extraScript:{onEnter(n){ud(n),n.state.forceState("unmed"),n.shiftFx(),n.hud.toast("you come to mid-stride, raw. this ward doesn't stay on one floor.")},isAvailable:n=>oa.isAvailable(n),onInteract:(n,t)=>oa.handleInteract(n,t),onCaught:n=>ud(n)}}),we=new Re;we.wallX(-6,6,5);we.wallZ(-7,5,-6);we.wallZ(-7,5,6);we.wallX(-6,-2.6,2.3);const tS={minX:-6,maxX:-2.6,minZ:2.18,maxZ:2.42},Vs={minX:-1,maxX:1,minZ:-.45,maxZ:.45};we.block([2,1,.9],[0,.5,0],"prop");we.solid(Vs.minX,Vs.maxX,Vs.minZ,Vs.maxZ);we.wallX(-6,-2,-3);we.wallX(2,6,-3);we.wallZ(-7,-3,-2);we.wallZ(-7,-3,2);we.wallX(-6,-1,-7);we.wallX(1,6,-7);const Ws={minX:-1,maxX:1,minZ:-7.1,maxZ:-6.9};we.colliders.push(Ws);const eS={minX:-2,maxX:2,minZ:-7,maxZ:-3};we.wallZ(-9,-7,-1);we.wallZ(-9,-7,1);we.wallX(-1,1,-9);we.block([1.8,2.6,.06],[0,1.4,-8.8],"glow");const nS=He([{x:-4,z:1},{x:4,z:1},{x:4,z:-2},{x:-4,z:-2}],we.colliders),iS=1.17,sS=-6.8,bu=[0,1.5,-7],aS=[-1,1.5,-7.85],Eu={id:"room18",name:"the Relay Room",floor:{minX:-6,maxX:6,minZ:-9,maxZ:5},spawn:{x:0,z:4,yaw:0},blocks:we.blocks,colliders:we.colliders,scrawls:[Xt(`the whole ward hangs
off one relay. theirs.`,"w",-6,3.4),Xt(`it only moves once.
they made sure.`,"w",-2,-5),Xt(`power for the doors,
or power for the lights.
never both. never again.`,"w",-2,-4,{size:2.2}),Xt(`the door won't move
till the relay does.`,"w",-2,-6.3,{size:2.2}),Xt(`lights: the long way, lit.
doors: the short way, dark.`,"e",2,-4.6,{size:2.2})],interactables:[kn({id:"dispenser18",side:"w",wallAt:-6,along:4,label:"use the dispenser"}),nl({id:"leverLights",side:"n",wallAt:-7,along:-1.6,label:"pull: power to the LIGHTS"}),nl({id:"leverDoors",side:"n",wallAt:-7,along:1.6,label:"pull: power to the DOORS"}),{id:"exitdoor18",type:"door",size:[2,3,.2],pos:bu,mat:"door",states:"both",facing:"pz",label:"the relay door"}],lights:[{pos:[0,4]},{pos:[-4.6,3.4]},{pos:[-3,-.5]},{pos:[3,-.5]},{pos:[0,-5]},{pos:[0,-8.6]}],exits:[{to:"room19",minX:-1,maxX:1,minZ:-8.9,maxZ:-7.9}]},rS=(()=>{let n=null;function t(e,i){n=i,e.flags.set("room18.power",i);const s=i==="lights"?"Doors":"Lights";e.removeInteractable(`lever${s}`);const a=i==="lights"?"Lights":"Doors",r=i==="lights"?-1.6:1.6;e.moveInteractable(`lever${a}`,[r,iS,sS]),Ws.minX=999,Ws.maxX=999.2,e.moveInteractable("exitdoor18",aS,Math.PI/2),e.hud.toast(i==="doors"?"the relay slams. somewhere, the bulbs give out for good.":"the relay slams. somewhere, a door stays shut for good."),e.hud.setObjective("the door ahead. whatever that bought you."),e.telemetry.event("wing_power_set",{power:i})}return Jl({orderlies:[{waypoints:nS,occluders:[tS,Vs,eS]}],colliders:we.colliders,spawn:Eu.spawn,onEnterObjective:"the relay room. it only moves once, and it's the only way out.",catchToast:`hands. a needle. "you don't get to pick twice," he says.`,unmedToast:"something paces the hall between you and the switches.",extraScript:{onEnter(e){n=null,Ws.minX=-1,Ws.maxX=1,e.moveInteractable("exitdoor18",bu,0)},isAvailable(e){return!(e==="exitdoor18"||n&&(e==="leverLights"||e==="leverDoors"))},onInteract(e,i){return e==="leverLights"||e==="leverDoors"?(n||t(i,e==="leverLights"?"lights":"doors"),!0):!1}}})})(),bl={x:-4,z:3.2,yaw:0},Rs=jl(2,7,-8,-3,.9),oS=fu(2,7,-3,-1,"z",.9,0),lS={minX:2,maxX:7,minZ:-8,maxZ:-1},Tu=[{x:-4,z:.5},{x:1,z:.5},{x:1,z:-6},{x:-4,z:-6}],Au=[{x:-4.5,z:-1},{x:-4.5,z:-6.5},{x:-3.8,z:-6.5},{x:-3.8,z:-1}];function Cu(n){const t=new Re;t.wallX(-7,7,4),t.wallZ(-8,4,-7),t.wallZ(-8,4,7);const e=[Xt(`the undercroft hums.
something was decided
before you got here.`,"w",-7,3.4,{size:2.2})];let i,s,a,r,o=[kn({id:"dispenser19",side:"w",wallAt:-7,along:3,label:"use the dispenser"})];if(n==="doors")t.wallX(-7,-6,2),t.wallX(-3,7,2),t.wallZ(-8,2,-6),t.wallZ(-8,2,-3),t.wallX(-7,-5.5,-8),t.wallX(-3.5,7,-8),t.block([2,2.6,.06],[-4.5,1.4,-7.9],"glow"),e.push(Xt(`wrong wiring for this door.
it never opens.`,"e",-3,-4,{size:2.2}),Xt(`straight line. dark as a mouth.
keep walking.`,"w",-6,-3.5,{size:2.2})),r=[{pos:[-4.5,3]},{pos:[0,3]}],a=[{to:"room20",minX:-5.5,maxX:-3.5,minZ:-7.9,maxZ:-7.2}];else{t.wallX(-7,-6,2),t.wallX(-1,7,2),t.wallX(-7,-1,-8),t.wallX(1,7,-8),t.block([1.8,2.6,.06],[0,1.4,-7.9],"glow"),t.block([5,Rs.y,5],[4.5,Rs.y/2,-5.5],"wall2");for(let d=0;d<3;d++){const u=Rs.y*(d+1)/3,f=-1-.333-d*.667;t.block([5,u,.667],[4.5,u/2,f],"wall2")}t.solid(1.88,2.12,-8,-1),t.block([.24,.9,7],[2,Rs.y+.45,-4.5],"chain"),t.block([5,.14,.12],[4.5,2.7,-.94],"glow"),e.push(Xt(`no door here.
they fed the bulbs instead.`,"w",-7,-3,{size:2.2}),Xt(`up, and over, and down.
take the breath while you can.`,"e",7,-5,{size:2.2})),i=[Rs],s=[oS],r=[{pos:[-4,3]},{pos:[-3,-1]},{pos:[-3,-5]},{pos:[4.5,-4]},{pos:[4.5,-7]},{pos:[0,-7]}],a=[{to:"room20",minX:-1,maxX:1,minZ:-7.9,maxZ:-7.2}]}He(n==="doors"?Au:Tu,t.colliders);const c=t.colliders.filter(d=>d.states===void 0||d.states==="both");return{def:{id:"room19",name:"the Undercroft",floor:{minX:-7,maxX:7,minZ:-8,maxZ:4},spawn:bl,blocks:t.blocks,colliders:t.colliders,scrawls:e,interactables:o,lights:r,exits:a,heightZones:i,ramps:s},colliders:c}}const Ru=Cu("doors"),Pu=Cu("lights");function cS(n="lights"){return n==="doors"?Ru.def:Pu.def}const hS={doors:{colliders:Ru.colliders,waypoints:Au,occluders:[],warn:"he is right there in the dark.",chase:"run. or stop being visible."},lights:{colliders:Pu.colliders,waypoints:Tu,occluders:[lS],warn:"the one on the floor sees you.",chase:"get above him, or run."}};function dS(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}const uS=(()=>{let n=null,t=!1;return{onEnter(i){const s=i.flags.get("room18.power")??"lights",a=hS[s];n==null||n.dispose(),n=new fe(i.scene,a.waypoints,a.occluders,pe(i,{warnToast:a.warn,chaseToast:a.chase,onCaught:()=>{i.state.forceState("lucid"),i.shiftFx(),i.teleportPlayer(bl.x,bl.z),i.hud.toast(`hands. a needle. "you don't get to pick twice," he says.`)}}),{colliders:a.colliders}),n.setWardState(i.state.state),t=!1,i.hud.setObjective(s==="doors"?"the corridor ahead is dark, and it is not empty. find the gap in his walk.":"up onto the floor above, then down and across. mind the crossings.")},onStateChange(i,s){n==null||n.setWardState(i),i==="unmed"&&!t&&(t=!0,s.hud.toast("the hum resolves into footsteps that keep his shape."))},update(i,s,a){if(!n)return;const r=a.playerPos();n.update(i,r.x,r.z,a.state.state);const o=n.watching,l=Math.hypot(n.x-r.x,n.z-r.z);o>0||n.chasing?a.hud.setThreat(o,dS(n.x-r.x,n.z-r.z,r.yaw)):a.hud.setThreat(0,null),a.audio.setThreat(o,l,n.chasing)},onLeave(i){i.hud.setThreat(0,null),i.audio.setThreat(0,1/0,!1),n==null||n.dispose(),n=null}}})(),gd=1,Oe=.43,On={x:2,z:1},fS=1.15,pS=.18,mS=[0,1.5,0],gS=[-.5,1.5,-.85],_S=[0,1.5,-16],vS=[-.5,1.5,-16.85],ge=new Re;ge.wallX(-6,6,6);ge.wallZ(-19,6,-6);ge.wallZ(-19,6,6);ge.wallX(-6,-1,-19);ge.wallX(1,6,-19);ge.block([1.8,2.6,.06],[0,1.4,-18.95],"glow");ge.wallX(-6,-.5,0);ge.wallX(.5,6,0);const Zs={minX:-.5,maxX:.5,minZ:-.1,maxZ:.1};ge.colliders.push(Zs);ge.wallX(-6,-.5,-16);ge.wallX(.5,6,-16);const Ys={minX:-.5,maxX:.5,minZ:-16.1,maxZ:-15.9};ge.colliders.push(Ys);const ls={minX:2,maxX:4,minZ:-6,maxZ:-5};ge.block([2,1,1],[3,.5,-5.5],"prop");ge.solid(ls.minX,ls.maxX,ls.minZ,ls.maxZ);const ic=Kl({id:"plate1",minX:.5,maxX:1.5,minZ:.5,maxZ:1.5});ge.blocks.push(ic.block);const sc=Kl({id:"plate2",minX:.5,maxX:1.5,minZ:-15.5,maxZ:-14.5});ge.blocks.push(sc.block);const $n={minX:On.x-Oe,maxX:On.x+Oe,minZ:On.z-Oe,maxZ:On.z+Oe};ge.colliders.push($n);const xS=He([{x:-5,z:-2},{x:-2,z:-2},{x:-2,z:-7},{x:-5,z:-7}],ge.colliders),MS=He([{x:2,z:-9},{x:5,z:-9},{x:5,z:-14},{x:2,z:-14}],ge.colliders),_d=ge.colliders.filter(n=>n!==$n&&(n.states===void 0||n.states==="both")),El={id:"room20",name:"the Loading Bay",floor:{minX:-6,maxX:6,minZ:-19,maxZ:6},spawn:{x:0,z:5,yaw:0},blocks:ge.blocks,colliders:ge.colliders,scrawls:[Xt(`it doesn't care what you are.
push it and it moves. that's the whole trick.`,"w",-6,2.5)],interactables:[kn({id:"dispenser20",side:"w",wallAt:-6,along:4,label:"use the dispenser"}),{id:"gate1",type:"door",size:[1,3,.2],pos:mS,mat:"door",states:"both",facing:"pz",label:"the gate"},{id:"gate2",type:"door",size:[1,3,.2],pos:_S,mat:"door",states:"both",facing:"pz",label:"the gate"},{id:"crate",type:"push_block",size:[.86,.86,.86],pos:[On.x,Oe,On.z],mat:"prop",states:"both",label:"push the crate"}],lights:[{pos:[0,4]},{pos:[0,.5]},{pos:[-3,-3]},{pos:[3,-3]},{pos:[-3,-8]},{pos:[3,-8]},{pos:[0,-11]},{pos:[-3,-13]},{pos:[3,-13]},{pos:[0,-15.5]},{pos:[0,-17.5]}],triggers:[ic.trigger,sc.trigger,{id:"enterZ2",minX:-6,maxX:6,minZ:-16,maxZ:0},{id:"vestibule20",minX:-6,maxX:6,minZ:-19,maxZ:-16}],exits:[{to:"END",minX:-1,maxX:1,minZ:-19,maxZ:-18.9}]};function yS(n,t,e){const i=Math.sin(e),s=Math.cos(e),a=-n*i-t*s,r=n*s-t*i;return Math.atan2(r,a)}const SS=(()=>{let n=null,t=null,e=!1,i=!1,s=!1,a=!1,r=On.x,o=On.z,l=!1,c=!1,h=null,d=[r,Oe,o],u=0;function f(C,E){r=C,o=E,$n.minX=C-Oe,$n.maxX=C+Oe,$n.minZ=E-Oe,$n.maxZ=E+Oe}function g(C){h=null,f(On.x,On.z),C.moveInteractable("crate",[r,Oe,o])}function _(C,E,T){const L=C-Oe,w=C+Oe,x=E-Oe,R=E+Oe;for(const O of ge.colliders)if(!(O===$n||!(O.states===void 0||O.states==="both"||O.states===T))&&L<O.maxX&&w>O.minX&&x<O.maxZ&&R>O.minZ)return!0;for(const O of[n,t]){if(!O)continue;const F=Math.max(L-O.x,0,O.x-w),H=Math.max(x-O.z,0,O.z-R);if(Math.hypot(F,H)<Bt.orderly.radius)return!0}return!1}function m(C){l||(l=!0,Zs.minX=999,Zs.maxX=999.2,C.moveInteractable("gate1",gS,Math.PI/2),C.hud.toast("it opens for the weight, not for you."),C.telemetry.event("gate_open",{gate:1}))}function p(C){c||(c=!0,Ys.minX=999,Ys.maxX=999.2,C.moveInteractable("gate2",vS,Math.PI/2),C.hud.toast("it remembers this part. you taught it that, back at the start of everything."),C.telemetry.event("gate_open",{gate:2}))}function S(C){n==null||n.dispose(),t==null||t.dispose(),n=new fe(C.scene,xS,[$n,ls],pe(C,{warnToast:"he is looking at you.",chaseToast:"run. or stop being visible.",onCaught:y}),{colliders:_d}),t=new fe(C.scene,MS,[$n,ls],pe(C,{warnToast:"the other one sees you too.",chaseToast:"run. or stop being visible.",onCaught:y}),{colliders:_d,eyeTint:16757575}),n.setWardState(C.state.state),t.setWardState(C.state.state)}function y(C){C.state.forceState("lucid"),C.shiftFx(),C.teleportPlayer(El.spawn.x,El.spawn.z),g(C),C.hud.toast("hands. a needle. and when you're back on your feet, it's already back on its shelf.")}return{onEnter(C){S(C),e=!1,i=!1,s=!1,a=!1,l=!1,c=!1,Zs.minX=-.5,Zs.maxX=.5,Ys.minX=-.5,Ys.maxX=.5,g(C),C.hud.setObjective("one crate. three jobs. no second one if you lose it.")},isAvailable(C){return C!=="gate1"&&C!=="gate2"},onInteract(C,E){if(C==="gate1"||C==="gate2")return!0;if(C!=="crate")return!1;const T=E.playerPos(),L=r-T.x,w=o-T.z;if(Math.hypot(L,w)>fS)return!0;const R=Math.abs(L)>=Math.abs(w)?Math.sign(L):0,O=R===0?Math.sign(w):0;if(R===0&&O===0)return!0;const F=r+R*gd,H=o+O*gd;return _(F,H,E.state.state)?(i||(i=!0,E.hud.toast("it doesn't go that way.")),E.telemetry.event("push_blocked"),!0):(h=[r,Oe,o],f(F,H),d=[r,Oe,o],u=0,E.telemetry.event("push"),!0)},onStateChange(C,E){n==null||n.setWardState(C),t==null||t.setWardState(C),C==="unmed"&&!e&&(e=!0,E.hud.toast("two of them work this floor. neither one stops for the crate."))},onTriggerEnter(C,E){C==="enterZ2"&&!s&&(s=!0,E.hud.setObjective("the last stretch. bring the thing that doesn't need to be told to be brave.")),C==="vestibule20"&&!a&&(a=!0,E.hud.setObjective("nothing left to carry. nothing left to push. just the door."))},update(C,E,T){if(h){u+=C;const H=Math.min(1,u/pS),V=h[0]+(d[0]-h[0])*H,G=h[2]+(d[2]-h[2])*H;T.moveInteractable("crate",[V,Oe,G]),H>=1&&(h=null)}if(!l&&fr(ic.trigger,r,o,T.state.state)&&m(T),!c&&fr(sc.trigger,r,o,T.state.state)&&p(T),!n||!t)return;const L=T.playerPos();n.update(C,L.x,L.z,T.state.state),t.update(C,L.x,L.z,T.state.state);const w=Math.hypot(n.x-L.x,n.z-L.z),x=Math.hypot(t.x-L.x,t.z-L.z),R=n.chasing||t.chasing,O=Math.max(n.watching,t.watching),F=Math.min(w,x);if(O>0||R){let H=n;(t.chasing&&!n.chasing||n.chasing===t.chasing&&(t.watching>n.watching||t.watching===n.watching&&x<w))&&(H=t);const V=yS(H.x-L.x,H.z-L.z,L.yaw);T.hud.setThreat(O,V)}else T.hud.setThreat(0,null);T.audio.setThreat(O,F,R)},onLeave(C){C.hud.setThreat(0,null),C.audio.setThreat(0,1/0,!1),n==null||n.dispose(),t==null||t.dispose(),n=null,t=null}}})(),ac={room1:{def:eM,script:nM},room2:{def:aM,script:rM},room3:{def:oM,script:lM},room4:{def:ol,script:fM},room5:{def:cl,script:vM},room6:{def:dl,script:EM},room7:{def:fl,script:PM},room8:{def:ml,script:FM},room9:{def:BM,script:HM},room10:{def:vl,script:$M},room11:{def:xl,script:ty},room12:{def:yl,script:oy},room13:{def:cy,script:fy},room14:{def:Sl,script:yy},room15:{def:wl,script:Dy},room16:{def:_u,script:Xy},room17:{def:$y,script:Qy},room18:{def:Eu,script:rS},room19:{build:n=>cS(n.get("room18.power")??"lights"),script:uS},room20:{def:El,script:SS}},tr=new URLSearchParams(location.search).get("room"),rc=tr&&ac[tr]?tr:"room1",Lu=document.getElementById("game"),ze=new xx,Fn=new jo(Lu),gi=new cv(Lu),ui=new hv,$t=new uv,Iu=new fv,Fe=new tl(Fn.scene),Ut=new pv,Tl=new tx(Fe);rc!=="room1"&&($t.canShift=!0,$t.refill());function Du(n){return{def:"def"in n?n.def:n.build(Iu),script:n.script}}let Me=Du(ac[rc]),Rr=!1,Pr=!1,oc=0,er=new Set;const ke=new mx(()=>({room:Me.def.id,x:Ut.x,z:Ut.z,yaw:Ut.yaw,level:Ut.level,pills:$t.pills,state:$t.state,medication:$t.medication}),{debug:tr!==null}),Ui={catches:0,shifts:0,pillsUsed:0};let xn={catches:0,shifts:0,pillsUsed:0,keypadFails:0,distance:0},_r=Ut.x,vr=Ut.z,Uu=0;const wS=new Proxy(ke,{get(n,t,e){if(t==="event")return(s,a)=>{s==="orderly_caught"?(Ui.catches++,xn.catches++):s==="keypad_denied"&&xn.keypadFails++,n.event(s,a)};const i=Reflect.get(n,t,n);return typeof i=="function"?i.bind(n):i}});function Nu(){ze.setPills($t.pills,$t.maxPills,$t.canShift)}function Ou(){ze.shiftPulse(),Fn.fovKick(),ui.shiftStinger()}let Al=!1,Ps=!1,Fu=0;function bS(n){if($t.state!=="lucid"){ze.setMedication(0,!1,!1),ui.setMedicationWarning(!1),Ps=!1;return}$t.tickMedication(n);const t=Bt.medication.warnSec/Bt.medication.durationSec,e=$t.medication<=t;e&&!Al&&(Al=!0,ze.toast("it's wearing thin.")),ze.setMedication($t.medication,!0,e),ui.setMedicationWarning(e),$t.medication<=0?dv(Ut.x,Ut.z,Bt.player.radius,Fe.colliders,Ut.level)?Ps||(Ps=!0,ze.toast("wearing off — keep moving.")):(Ps=!1,$t.forceState("unmed","expiry"),ze.toast("the calm drains out of you."),ui.medicationExpiredCue(),ke.event("medication_expired",{room:Me.def.id,lucid_duration_s:Math.round((performance.now()-Fu)/100)/10})):Ps=!1}const Jn={state:$t,hud:ze,audio:ui,telemetry:wS,flags:Iu,removeInteractable:n=>Fe.removeInteractable(n),moveInteractable:(n,t,e)=>{const i=Fe.entries().find(s=>s.def.id===n);i&&(i.mesh.position.set(t[0],t[1],t[2]),e!==void 0&&(i.mesh.rotation.y=e))},shiftFx:Ou,releasePointerLock:()=>gi.releasePointerLock(),scene:Fn.scene,playerPos:()=>({x:Ut.x,z:Ut.z,yaw:Ut.yaw,level:Ut.level}),teleportPlayer:(n,t,e)=>{Ut.x=n,Ut.z=t,e!==void 0&&(Ut.level=e),_r=n,vr=t},updateScrawlText:(n,t)=>Fe.updateScrawlText(n,t),isRoomDark:()=>Fe.isDark(),setRoomDark:n=>{Fe.applyLight(n),Fn.setDark(n)},updateIconPanel:(n,t)=>Fe.updateIconPanel(n,t),setGlowFade:n=>Fe.setGlowFade(n)};let Cl=!1;$t.onChange=(n,t,e)=>{var i,s;Fe.applyState(n),ze.setState(n),ui.setState(n),Nu(),n==="lucid"&&(Al=!1,Fu=performance.now()),Cl||(ke.event("shift",{direction:`${t}->${n}`,source:e??"forced"}),Ui.shifts++,xn.shifts++),(s=(i=Me.script).onStateChange)==null||s.call(i,n,Jn)};gi.onShift=()=>{if(!Rr||Pr)return;const n=$t.state;Cl=!0;const t=$t.shift();Cl=!1,t==="ok"?(Ou(),ke.event("shift",{direction:`${n}->${$t.state}`,source:"manual"}),Ui.shifts++,xn.shifts++,n==="unmed"&&(Ui.pillsUsed++,xn.pillsUsed++)):t==="no-ability"?ze.toast("you have nothing to shift with. yet."):(ze.toast("you pat your pockets. nothing. lucidity has a price."),ke.event("pills_empty"))};gi.onInteract=()=>{!Rr||Pr||Tl.interact(Me.script,Jn)};function zu(n){var t,e;Me=Du(ac[n]),Fe.loadRoom(Me.def),Fe.applyState($t.state),Fe.applyLight(Me.def.startDark??!1),Fn.setDark(Me.def.startDark??!1),Fn.setRoomLights(Me.def.lights.map(i=>i.pos)),ze.setRoomLabel(Me.def.name),Ut.spawn({...Me.def.spawn,level:Me.def.spawn.level??((e=(t=Me.def.levels)==null?void 0:t[0])==null?void 0:e.id)??"__flat"}),er.clear(),oc=performance.now(),xn={catches:0,shifts:0,pillsUsed:0,keypadFails:0,distance:0},Uu=ke.activeMs,_r=Ut.x,vr=Ut.z}function ES(n){zu(n),ke.event("room_enter"),Me.script.onEnter(Jn),ke.flush()}function TS(n){var t,e;ke.event("room_complete",{duration_s:Math.round((performance.now()-oc)/100)/10,active_s:Math.round((ke.activeMs-Uu)/100)/10,catches:xn.catches,shifts:xn.shifts,pills_used:xn.pillsUsed,keypad_fails:xn.keypadFails,distance_m:Math.round(xn.distance*10)/10,med_left:$t.state==="lucid"?Math.round($t.medication*100)/100:0}),(e=(t=Me.script).onLeave)==null||e.call(t,Jn),n==="END"?AS():ES(n)}function AS(){Pr=!0,gi.enabled=!1,gi.releasePointerLock(),ze.setPrompt(null),ke.event("game_complete",{duration_s:Math.round((performance.now()-ku)/100)/10,active_s:Math.round(ke.activeMs/100)/10,catches:Ui.catches,shifts:Ui.shifts,pills_used:Ui.pillsUsed,run_index:ke.runIndex}),ke.flush(),ze.showEndCard("END OF THE NEW WING","THE LAST WARD WASN'T THE LAST.",`<em>PLAYTEST — tell the devs:</em><br><br>
     1 · Seven new rooms, each a different lock: pressure plate (14), colored shapes (15), the lights (16), two floors (17), the power lever (18–19), the crate (20). Which one actually made you stop and think — and which one fell flat?<br>
     2 · Room 17 stacked two floors — did you ever read the lower floor from the balcony, or get caught because you forgot an orderly was down there?<br>
     3 · Room 18's lever only moves once. Did LIGHTS or DOORS feel like a real choice, and would you replay to see the other branch?<br>
     4 · The wing has no keypads at all — a deliberate break from the codes in the main game. Did you miss them, or was it a relief?<br>
     5 · You ended with ${$t.pills}/${$t.maxPills} pills. Across seven rooms, was the single pill ever the thing that decided a run?`,"READMIT",()=>location.reload())}function CS(){for(const n of Me.def.exits)if(Ut.x>n.minX&&Ut.x<n.maxX&&Ut.z>n.minZ&&Ut.z<n.maxZ){TS(n.to);return}}ze.setState($t.state);zu(rc);Nu();ke.pageLoad();ze.bindConfig(yn,n=>{vx(n),ke.event("settings_change",{key:"randomizeCodes",value:n})});let ku=0;ze.showStart(()=>{Rr=!0,gi.enabled=!0,ui.init(),ui.setState($t.state),ku=performance.now(),ke.start(),ke.event("room_enter"),Me.script.onEnter(Jn),oc=performance.now()});const vd=new av;function Bu(){var e,i,s,a,r,o;requestAnimationFrame(Bu);const n=Math.min(vd.getDelta(),.05),t=vd.elapsedTime;if(Rr&&!Pr){Ut.update(n,gi,Fe.colliders,$t.state),Ut.level=gv(Ut.level,Ut.x,Ut.z,Fe.stairwells),xn.distance+=Math.hypot(Ut.x-_r,Ut.z-vr),_r=Ut.x,vr=Ut.z,Ut.y+=(Fe.floorHeightAt(Ut.level,Ut.x,Ut.z)-Ut.y)*.35;const l=new Set;for(const h of Me.def.triggers??[])fr(h,Ut.x,Ut.z,$t.state)&&l.add(h.id);for(const h of l)er.has(h)||(i=(e=Me.script).onTriggerEnter)==null||i.call(e,h,Jn);for(const h of er)l.has(h)||(a=(s=Me.script).onTriggerExit)==null||a.call(s,h,Jn);er=l,(o=(r=Me.script).update)==null||o.call(r,n,t,Jn),bS(n);const c=Tl.update(Fn.camera,$t.state,Me.script,Jn);Fe.setFocused(Tl.focusedId),ze.setPrompt(c?(gi.isTouch?"◉ ":"[E] ")+c:null),CS()}Ut.syncCamera(Fn.camera,t,$t.state),Fe.update(t),Fn.update(n,t,$t.state),Fn.render()}Bu();
