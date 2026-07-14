export interface Product {

id:string;

name:string;

brand:string;

category:string;

price:number;

images:string[];

description:string;

sizes:string[];

available:boolean;

wbUrl:string;

stockShop:number;

stockFBS:number;

stockWB:number;

status:string;

}

const API_URL=
"https://script.google.com/macros/s/AKfycbzjrIaEGBIaQtD67GKYfi712ZN5c2VILKYrmEyIONMOK_W2cWr4IudBrmzEMc3wb9U82w/exec";

export async function getProducts()
:Promise<Product[]>{

const res =
await fetch(
API_URL+"?action=products"
);

if(!res.ok){

throw new Error(
"API error"
);

}

return await res.json();

}