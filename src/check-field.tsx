import type {ReactNode} from 'react';
export function CheckField({checked,onChange,children,disabled=false}:{checked:boolean;onChange:(checked:boolean)=>void;children:ReactNode;disabled?:boolean}){
 return <label className="check"><input type="checkbox" checked={checked} disabled={disabled} onChange={event=>onChange(event.target.checked)}/><span>{children}</span></label>;
}
