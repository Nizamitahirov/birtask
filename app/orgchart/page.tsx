'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTeam } from '@/hooks/useSheets'
import { db } from '@/lib/db'
import { TeamMember } from '@/lib/types'
import toast from 'react-hot-toast'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PALETTES: [string, string][] = [
  ['#5B5BF5','#B57BFF'],['#FF8B7B','#FFD466'],['#16C098','#67E8C5'],
  ['#4DABF7','#A78BFA'],['#E879C8','#FF8FB1'],['#F5A524','#FF8B7B'],
  ['#7C5BF7','#E879C8'],['#16C098','#5B5BF5'],
]
function pal(seed: string): [string,string] {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h*31+seed.charCodeAt(i))|0
  return PALETTES[Math.abs(h)%8]
}

const DEPT_C = ['#4F6AF5','#E85454','#10B981','#F59E0B','#8B5CF6','#06B6D4','#EC4899','#F97316']
function deptCol(s: string) {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h*31+s.charCodeAt(i))|0
  return DEPT_C[Math.abs(h)%DEPT_C.length]
}

function initials(name: string) { return name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() }

// ─── Layout ───────────────────────────────────────────────────────────────────

const CW = 256, CH = 134, HG = 28, VG = 80   // vertical
const CWH = 228, CHH = 108, HGH = 56, VGH = 18 // horizontal
const MAX_COLS = 4

type Dir = 'V'|'H'
interface Pos { x:number; y:number }

interface LayoutResult {
  positions: Map<string,Pos>
  childMap: Map<string,string[]>
  roots: string[]
  levels: Map<string,number>
  totalW: number; totalH: number
  rowGroupsMap: Map<string, string[][]>
}

function buildLayout(members: TeamMember[], collapsed: Set<string>, dir: Dir): LayoutResult {
  const ids = new Set(members.map(m=>m.id))
  const childMap = new Map<string,string[]>()
  const roots: string[] = []
  members.forEach(m => {
    const ok = m.managerId && ids.has(m.managerId) && m.managerId !== m.id
    if (ok) { const a=childMap.get(m.managerId!)||[]; a.push(m.id); childMap.set(m.managerId!,a) }
    else roots.push(m.id)
  })

  const levels = new Map<string,number>()
  const calcLevel = (id: string, lv: number, vis=new Set<string>()) => {
    if (vis.has(id)) return; levels.set(id,lv); vis.add(id)
    ;(childMap.get(id)||[]).forEach(c=>calcLevel(c,lv+1,new Set(vis)))
  }
  roots.forEach(r=>calcLevel(r,1))

  const wCache = new Map<string,number>()
  const hCache = new Map<string,number>()
  const treeHCache = new Map<string,number>()
  const positions = new Map<string,Pos>()
  const rowGroupsMap = new Map<string,string[][]>()

  // ── Vertical layout ──────────────────────────────────────────────────────────
  const subW = (id:string, vis=new Set<string>()):number => {
    if (vis.has(id)||wCache.has(id)) return wCache.get(id)||CW
    vis=new Set(vis); vis.add(id)
    if (collapsed.has(id)){wCache.set(id,CW);return CW}
    const ch=childMap.get(id)||[]
    if(!ch.length){wCache.set(id,CW);return CW}
    const rows:string[][]=[]
    for(let i=0;i<ch.length;i+=MAX_COLS) rows.push(ch.slice(i,i+MAX_COLS))
    const rowWidths=rows.map(row=>row.reduce((s,c,i)=>s+subW(c,vis)+(i?HG:0),0))
    const w=Math.max(CW,...rowWidths)
    wCache.set(id,w);return w
  }
  const subTreeH = (id:string, vis=new Set<string>()):number => {
    if(vis.has(id)) return CH
    if(treeHCache.has(id)) return treeHCache.get(id)!
    vis=new Set(vis); vis.add(id)
    if(collapsed.has(id)){treeHCache.set(id,CH);return CH}
    const ch=childMap.get(id)||[]
    if(!ch.length){treeHCache.set(id,CH);return CH}
    const rows:string[][]=[]
    for(let i=0;i<ch.length;i+=MAX_COLS) rows.push(ch.slice(i,i+MAX_COLS))
    let h=CH+VG
    rows.forEach((row,ri)=>{
      h+=Math.max(...row.map(c=>subTreeH(c,vis)))
      if(ri<rows.length-1) h+=VG
    })
    treeHCache.set(id,h);return h
  }
  // Pre-compute all widths & heights so place() can read from cache safely
  roots.forEach(r=>{ subW(r); subTreeH(r) })
  // place() uses leftEdge (left boundary of the full subtree span).
  // Node box is centered within that span → no child can overflow left or overlap siblings.
  const place = (id:string,leftEdge:number,y:number,vis=new Set<string>()) => {
    if(vis.has(id))return; vis=new Set(vis); vis.add(id)
    const span=wCache.get(id)??CW
    const centerX=leftEdge+span/2
    positions.set(id,{x:centerX-CW/2,y})
    if(collapsed.has(id))return
    const ch=childMap.get(id)||[]; if(!ch.length)return
    const rows:string[][]=[]
    for(let i=0;i<ch.length;i+=MAX_COLS) rows.push(ch.slice(i,i+MAX_COLS))
    rowGroupsMap.set(id,rows)
    let rowY=y+CH+VG
    rows.forEach(row=>{
      const rowW=row.reduce((s,c,i)=>s+(wCache.get(c)??CW)+(i?HG:0),0)
      let cx=centerX-rowW/2
      row.forEach(c=>{const w=wCache.get(c)??CW;place(c,cx,rowY,vis);cx+=w+HG})
      rowY+=Math.max(...row.map(c=>treeHCache.get(c)??CH))+VG
    })
  }

  // ── Horizontal layout ────────────────────────────────────────────────────────
  const subH = (id:string,vis=new Set<string>()):number => {
    if(vis.has(id)||hCache.has(id)) return hCache.get(id)||CHH
    vis=new Set(vis); vis.add(id)
    if(collapsed.has(id)){hCache.set(id,CHH);return CHH}
    const ch=childMap.get(id)||[]
    if(!ch.length){hCache.set(id,CHH);return CHH}
    const h=Math.max(CHH,ch.reduce((s,c,i)=>s+subH(c,vis)+(i?VGH:0),0))
    hCache.set(id,h);return h
  }
  const placeH = (id:string,x:number,y:number,vis=new Set<string>()) => {
    if(vis.has(id))return; vis=new Set(vis); vis.add(id)
    positions.set(id,{x,y})
    if(collapsed.has(id))return
    const ch=childMap.get(id)||[]; if(!ch.length)return
    const tot=ch.reduce((s,c,i)=>s+subH(c,vis)+(i?VGH:0),0)
    let cy=y+CHH/2-tot/2
    ch.forEach(c=>{const h=subH(c,vis);placeH(c,x+CWH+HGH,cy,vis);cy+=h+VGH})
  }

  if (dir === 'V') {
    let rx=0
    roots.forEach(r=>{place(r,rx,0);rx+=(wCache.get(r)??CW)+HG*2})
    let mxX=0,mxY=0; positions.forEach(({x,y})=>{mxX=Math.max(mxX,x+CW);mxY=Math.max(mxY,y+CH)})
    return {positions,childMap,roots,levels,totalW:mxX,totalH:mxY,rowGroupsMap}
  } else {
    let ry=0
    roots.forEach(r=>{placeH(r,0,ry);ry+=subH(r)+VGH*3})
    let mxX=0,mxY=0; positions.forEach(({x,y})=>{mxX=Math.max(mxX,x+CWH);mxY=Math.max(mxY,y+CHH)})
    return {positions,childMap,roots,levels,totalW:mxX,totalH:mxY,rowGroupsMap:new Map()}
  }
}

// ─── SVG Lines ────────────────────────────────────────────────────────────────

function OrgLines({ positions, childMap, collapsed, members, dir, rowGroupsMap }:{
  positions:Map<string,Pos>; childMap:Map<string,string[]>
  collapsed:Set<string>; members:TeamMember[]; dir:Dir
  rowGroupsMap: Map<string,string[][]>
}) {
  const cw = dir==='V'?CW:CWH, ch = dir==='V'?CH:CHH
  const vg = dir==='V'?VG:HGH
  const paths:{d:string;dashed:boolean}[] = []

  if (dir==='V') {
    childMap.forEach((children, parentId)=>{
      if(collapsed.has(parentId)) return
      const pp = positions.get(parentId); if(!pp) return
      const pCX = pp.x+cw/2, pBottom = pp.y+ch

      // Use row groups if available, otherwise treat all children as one row
      const rows = rowGroupsMap.get(parentId) || [children]

      // Compute midY for each row (halfway between this row's children top and the gap above)
      const rowMidYs: number[] = rows.map(row => {
        const firstPos = positions.get(row[0])
        if (!firstPos) return pBottom + vg/2
        return firstPos.y - vg/2
      })

      const lastMidY = rowMidYs[rowMidYs.length - 1]

      // Vertical trunk from parent bottom down to last row's midY
      paths.push({d:`M${pCX},${pBottom} L${pCX},${lastMidY}`, dashed:false})

      // For each row: horizontal span + drops
      rows.forEach((row, ri) => {
        const midY = rowMidYs[ri]
        const valid = row.filter(c => positions.has(c))
        if (!valid.length) return
        const leftCX = Math.min(...valid.map(c=>(positions.get(c)?.x||0)+cw/2))
        const rightCX = Math.max(...valid.map(c=>(positions.get(c)?.x||0)+cw/2))
        if (leftCX !== rightCX) paths.push({d:`M${leftCX},${midY} L${rightCX},${midY}`, dashed:false})
        valid.forEach(c=>{
          const cp=positions.get(c)!
          paths.push({d:`M${cp.x+cw/2},${midY} L${cp.x+cw/2},${cp.y}`, dashed:false})
        })
      })
    })
    // functional manager dashed lines
    members.forEach(m=>{
      if(!m.functionalManagerId||m.functionalManagerId===m.id) return
      const fp=positions.get(m.functionalManagerId), mp=positions.get(m.id)
      if(!fp||!mp) return
      const x1=fp.x+cw/2, y1=fp.y+ch, x2=mp.x+cw/2, y2=mp.y
      const my=(y1+y2)/2
      paths.push({d:`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`, dashed:true})
    })

  } else {
    // horizontal
    childMap.forEach((children,parentId)=>{
      if(collapsed.has(parentId)) return
      const pp=positions.get(parentId); if(!pp) return
      const pRight=pp.x+cw, pCY=pp.y+ch/2
      const midX=pRight+vg/2
      const valid=children.map(c=>positions.get(c)).filter(Boolean) as Pos[]
      if(!valid.length) return
      const topCY=Math.min(...children.map(c=>(positions.get(c)?.y||0)+ch/2))
      const botCY=Math.max(...children.map(c=>(positions.get(c)?.y||0)+ch/2))
      paths.push({d:`M${pRight},${pCY} L${midX},${pCY}`, dashed:false})
      if(topCY!==botCY) paths.push({d:`M${midX},${topCY} L${midX},${botCY}`, dashed:false})
      children.forEach(c=>{
        const cp=positions.get(c); if(!cp) return
        paths.push({d:`M${midX},${cp.y+ch/2} L${cp.x},${cp.y+ch/2}`, dashed:false})
      })
    })
    members.forEach(m=>{
      if(!m.functionalManagerId||m.functionalManagerId===m.id) return
      const fp=positions.get(m.functionalManagerId), mp=positions.get(m.id)
      if(!fp||!mp) return
      const x1=fp.x+cw, y1=fp.y+ch/2, x2=mp.x, y2=mp.y+ch/2
      const mx=(x1+x2)/2
      paths.push({d:`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`, dashed:true})
    })
  }

  const svgW = Math.max(...Array.from(positions.values()).map(p=>p.x+cw))+200
  const svgH = Math.max(...Array.from(positions.values()).map(p=>p.y+ch))+200

  return (
    <svg style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'visible'}} width={svgW} height={svgH}>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,1 L5,3 L0,5" fill="none" stroke="#94A3B8" strokeWidth="1.2"/>
        </marker>
        <marker id="arrF" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,1 L5,3 L0,5" fill="none" stroke="#8B5CF6" strokeWidth="1.2"/>
        </marker>
      </defs>
      {paths.map((p,i)=>(
        <path key={i} d={p.d}
          stroke={p.dashed?'#8B5CF6':'#94A3B8'}
          strokeWidth={p.dashed?1.5:1.5}
          strokeDasharray={p.dashed?'5 3':undefined}
          fill="none"
          markerEnd={p.dashed?'url(#arrF)':'url(#arr)'}
        />
      ))}
    </svg>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function NodeCard({ member, level, childCount, isCollapsed, isOver, isDragging, dir,
  onDragStart, onDragOver, onDragLeave, onDrop,
  onToggle, onClick, onScrollToParent, hasParent,
}:{
  member:TeamMember; level:number; childCount:number; isCollapsed:boolean
  isOver:boolean; isDragging:boolean; dir:Dir; hasParent:boolean
  onDragStart:()=>void; onDragOver:(e:React.DragEvent)=>void
  onDragLeave:()=>void; onDrop:(e:React.DragEvent)=>void
  onToggle:()=>void; onClick:()=>void; onScrollToParent:()=>void
}) {
  const [c1,c2]=pal(member.id)
  const dc=deptCol(member.department||'x')
  const cw=dir==='V'?CW:CWH
  const hasFM = !!member.functionalManagerId

  return (
    <div
      draggable
      onDragStart={e=>{e.dataTransfer.effectAllowed='move';onDragStart()}}
      onDragOver={e=>{e.preventDefault();e.stopPropagation();onDragOver(e)}}
      onDragLeave={onDragLeave}
      onDrop={e=>{e.preventDefault();e.stopPropagation();onDrop(e)}}
      onClick={onClick}
      style={{
        width:cw, borderRadius:12,
        background:'var(--surface)',
        border:`1.5px solid ${isOver?'#4F6AF5':'var(--border)'}`,
        boxShadow: isOver
          ? '0 0 0 3px rgba(79,106,245,0.15), 0 4px 20px rgba(0,0,0,0.1)'
          : '0 2px 12px rgba(0,0,0,0.07)',
        cursor:'pointer', userSelect:'none',
        opacity:isDragging?0.35:1,
        transition:'border-color .15s, box-shadow .15s, opacity .15s',
        position:'relative', overflow:'visible',
      }}
    >
      <div style={{borderRadius:10, overflow:'hidden'}}>
        {/* Top section */}
        <div style={{padding:'12px 12px 8px', display:'flex', gap:10, alignItems:'flex-start'}}>
          {/* Avatar */}
          <div style={{position:'relative', flexShrink:0}}>
            <div style={{
              width:38, height:38, borderRadius:'50%',
              background:`linear-gradient(135deg,${c1},${c2})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontSize:13, fontWeight:800,
              boxShadow:`0 3px 8px ${c1}40`,
            }}>{initials(member.name)}</div>
            {/* Status dot */}
            <div style={{
              position:'absolute', bottom:1, right:1,
              width:9, height:9, borderRadius:'50%',
              background:'#10B981', border:'2px solid var(--surface)',
            }}/>
          </div>

          {/* Name + role */}
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:13, fontWeight:800, color:'var(--ink)', lineHeight:1.25,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {member.name}
            </div>
            <div style={{fontSize:10.5, color:'var(--ink-2)', marginTop:2,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {member.role||'—'}
            </div>
          </div>

          {/* Level + up arrow */}
          <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0}}>
            <span style={{
              padding:'2px 6px', borderRadius:5,
              background:'rgba(79,106,245,0.1)', color:'#4F6AF5',
              fontSize:9, fontWeight:800, letterSpacing:'0.04em',
            }}>L{level}</span>
            {hasParent && (
              <button onClick={e=>{e.stopPropagation();onScrollToParent()}}
                title="Rəhbərə get"
                style={{
                  width:18, height:18, borderRadius:5,
                  border:'1px solid var(--border)', background:'var(--surface-2)',
                  color:'var(--muted)', cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                <span className="material-symbols-rounded" style={{fontSize:11}}>arrow_upward</span>
              </button>
            )}
          </div>
        </div>

        {/* Company / func tags */}
        {(member.company || member.department || hasFM) && (
          <div style={{padding:'0 12px 8px', display:'flex', gap:5, flexWrap:'wrap'}}>
            {(member.company || member.department) && (
              <span style={{
                padding:'2px 8px', borderRadius:5,
                background:'var(--surface-2)', border:'1px solid var(--border)',
                fontSize:9.5, fontWeight:600, color:'var(--ink-2)',
                display:'flex', alignItems:'center', gap:4,
                maxWidth: '100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>
                <span className="material-symbols-rounded" style={{fontSize:10, color:dc}}>business</span>
                {member.company || member.department}
              </span>
            )}
            {hasFM && (
              <span style={{
                padding:'2px 8px', borderRadius:5,
                background:'rgba(139,92,246,0.08)', border:'1px dashed rgba(139,92,246,0.3)',
                fontSize:9.5, fontWeight:600, color:'#8B5CF6',
                display:'flex', alignItems:'center', gap:4,
              }}>
                <span className="material-symbols-rounded" style={{fontSize:10}}>hub</span>
                Funksional
              </span>
            )}
          </div>
        )}

        {/* Direct reports footer */}
        {childCount > 0 && (
          <div style={{
            padding:'6px 12px',
            borderTop:'1px solid var(--border)',
            display:'flex', alignItems:'center',
            background:'var(--surface-2)',
          }}>
            <span style={{fontSize:10.5, color:'var(--muted)', display:'flex', alignItems:'center', gap:5}}>
              <span className="material-symbols-rounded" style={{fontSize:13}}>groups</span>
              {childCount} Direct Report{childCount!==1?'s':''}
            </span>
          </div>
        )}
      </div>

      {/* Collapse button */}
      {childCount>0 && (
        <button
          onClick={e=>{e.stopPropagation();onToggle()}}
          style={{
            position:'absolute',
            ...(dir==='V'
              ? {bottom:-14, left:'50%', transform:'translateX(-50%)'}
              : {right:-14, top:'50%', transform:'translateY(-50%)'}),
            width:26, height:26, borderRadius:'50%',
            background:isCollapsed?'#10B981':'#EF4444',
            color:'#fff', border:'3px solid var(--surface)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', zIndex:5, fontSize:14, fontWeight:800,
            boxShadow:'0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          {isCollapsed?'+':'−'}
        </button>
      )}
    </div>
  )
}

// ─── Member Modal ─────────────────────────────────────────────────────────────

function MemberModal({member, members, onClose}:{member:TeamMember;members:TeamMember[];onClose:()=>void}) {
  const [c1,c2]=pal(member.id)
  const dc=deptCol(member.department||'x')
  const mgr=members.find(m=>m.id===member.managerId)
  const fmgr=members.find(m=>m.id===member.functionalManagerId)
  const reports=members.filter(m=>m.managerId===member.id)

  return createPortal(
    <div style={{position:'fixed',inset:0,zIndex:99999,
      background:'rgba(10,10,30,0.5)',backdropFilter:'blur(4px)',
      display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:460, borderRadius:20,
        background:'var(--surface)', border:'1px solid var(--border)',
        boxShadow:'0 32px 80px rgba(0,0,0,0.2)', overflow:'hidden',
      }}>
        <div style={{height:5, background:`linear-gradient(90deg,${c1},${c2})`}}/>
        <div style={{padding:'24px 24px 0', display:'flex', gap:16, alignItems:'flex-start'}}>
          <div style={{
            width:64, height:64, borderRadius:16, flexShrink:0,
            background:`linear-gradient(135deg,${c1},${c2})`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontSize:20, fontWeight:800,
            boxShadow:`0 6px 20px ${c1}50`,
          }}>{initials(member.name)}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:18, fontWeight:800, color:'var(--ink)', letterSpacing:'-0.02em'}}>{member.name}</div>
            <div style={{fontSize:13, color:'var(--ink-2)', marginTop:2}}>{member.position||member.role||'—'}</div>
            <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:6}}>
              {member.company&&<span style={{
                display:'inline-flex', alignItems:'center', gap:4,
                padding:'3px 10px', borderRadius:999,
                background:dc+'18', color:dc, fontSize:11, fontWeight:700,
              }}><span className="material-symbols-rounded" style={{fontSize:12}}>business</span>{member.company}</span>}
              {member.personalCode&&<span style={{
                display:'inline-flex', alignItems:'center', gap:4,
                padding:'3px 10px', borderRadius:999,
                background:'var(--surface-2)', border:'1px solid var(--border)',
                fontSize:11, fontWeight:700, color:'var(--ink-2)', fontFamily:'monospace',
              }}># {member.personalCode}</span>}
              {member.finCode&&<span style={{
                display:'inline-flex', alignItems:'center', gap:4,
                padding:'3px 10px', borderRadius:999,
                background:'var(--surface-2)', border:'1px solid var(--border)',
                fontSize:11, fontWeight:700, color:'var(--ink-2)', fontFamily:'monospace',
              }}>FIN: {member.finCode}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{
            width:32, height:32, borderRadius:9,
            border:'1px solid var(--border)', background:'var(--surface-2)',
            color:'var(--muted)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}><span className="material-symbols-rounded" style={{fontSize:16}}>close</span></button>
        </div>
        <div style={{padding:'16px 24px 24px', display:'flex', flexDirection:'column', gap:8}}>
          {[
            {icon:'mail',label:'E-poçt',val:member.email,color:'var(--primary)'},
            {icon:'call',label:'Telefon',val:member.phone,color:'#10B981'},
            {icon:'apartment',label:'Departament',val:member.department,color:'var(--muted)'},
            {icon:'hub',label:'Funksional sahə',val:member.division,color:'var(--muted)'},
            {icon:'category',label:'Bölmə',val:member.section,color:'var(--muted)'},
            {icon:'account_tree',label:'Birbaşa rəhbər',val:mgr?.name,sub:mgr?.position||mgr?.role,color:'#4F6AF5'},
            {icon:'hub',label:'Funksional rəhbər',val:fmgr?.name,sub:fmgr?.position||fmgr?.role,color:'#8B5CF6',dashed:true},
          ].filter(r=>r.val).map(r=>(
            <div key={r.label} style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'10px 14px', borderRadius:12,
              background:'var(--surface-2)', border:`1px solid ${r.dashed?'rgba(139,92,246,0.2)':'var(--border)'}`,
            }}>
              <span className="material-symbols-rounded" style={{fontSize:16, color:r.color, flexShrink:0}}>{r.icon}</span>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:9.5, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em'}}>{r.label}</div>
                <div style={{fontSize:13, fontWeight:700, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {r.val}{r.sub&&<span style={{color:'var(--muted)', fontWeight:500}}> · {r.sub}</span>}
                </div>
              </div>
            </div>
          ))}
          {reports.length>0&&(
            <div style={{marginTop:4}}>
              <div style={{fontSize:10, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8}}>
                Birbaşa tabelilər ({reports.length})
              </div>
              <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                {reports.map(r=>{const[rc1,rc2]=pal(r.id);return(
                  <div key={r.id} style={{
                    display:'flex', alignItems:'center', gap:7,
                    padding:'5px 10px', borderRadius:999,
                    background:'var(--surface-3)', border:'1px solid var(--border)',
                    fontSize:11, fontWeight:600, color:'var(--ink)',
                  }}>
                    <div style={{width:20, height:20, borderRadius:'50%', flexShrink:0,
                      background:`linear-gradient(135deg,${rc1},${rc2})`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontSize:8, fontWeight:800}}>
                      {initials(r.name)}
                    </div>
                    {r.name}
                  </div>
                )})}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Visual Chart ─────────────────────────────────────────────────────────────

function VisualChart({ members, onUpdateManager }:{
  members:TeamMember[]
  onUpdateManager:(id:string, field:'managerId'|'functionalManagerId', val:string|null)=>void
}) {
  const [dir, setDir] = useState<Dir>('V')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [tf, setTf] = useState({x:80, y:60, scale:0.9})
  const [panning, setPanning] = useState(false)
  const [panO, setPanO] = useState({mx:0,my:0,tx:0,ty:0})
  const [draggingId, setDraggingId] = useState<string|null>(null)
  const [dragOverId, setDragOverId] = useState<string|null>(null)
  const [selectedMember, setSelectedMember] = useState<TeamMember|null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const outerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await outerRef.current?.requestFullscreen()
  }

  const layout = buildLayout(members, collapsed, dir)
  const { positions, childMap, roots, levels, totalW, totalH, rowGroupsMap } = layout

  const cw = dir==='V'?CW:CWH, ch = dir==='V'?CH:CHH

  const centerView = useCallback(() => {
    const el = containerRef.current; if(!el || !totalW || !totalH) return
    const w = el.offsetWidth, h = el.offsetHeight
    const sc = Math.max(0.1, Math.min(0.9, (w-80)/totalW, (h-80)/totalH))
    setTf({ x: Math.max(20, (w - totalW*sc)/2), y: Math.max(20, (h - totalH*sc)/2), scale: sc })
  }, [totalW, totalH])

  useEffect(() => { const t = setTimeout(centerView, 60); return () => clearTimeout(t) }, [centerView, dir])

  const zoom = (d:number) => setTf(t=>({...t, scale:Math.max(0.2,Math.min(2.5,t.scale+d))}))

  const scrollToNode = (id:string) => {
    const pos=positions.get(id); if(!pos||!containerRef.current) return
    const w=containerRef.current.offsetWidth, h=containerRef.current.offsetHeight
    setTf(t=>({...t, x:w/2-(pos.x+cw/2)*t.scale, y:h/2-(pos.y+ch/2)*t.scale}))
  }

  const onWheel = (e:React.WheelEvent) => { e.preventDefault(); zoom(e.deltaY<0?0.08:-0.08) }
  const onMD = (e:React.MouseEvent) => {
    if((e.target as HTMLElement).closest('[data-node]')) return
    setPanning(true); setPanO({mx:e.clientX,my:e.clientY,tx:tf.x,ty:tf.y})
  }
  const onMM = (e:React.MouseEvent) => {
    if(!panning) return
    setTf(t=>({...t, x:panO.tx+e.clientX-panO.mx, y:panO.ty+e.clientY-panO.my}))
  }
  const onMU = () => setPanning(false)

  const handleDrop = (e:React.DragEvent, targetId:string) => {
    e.preventDefault()
    if(!draggingId||draggingId===targetId){setDragOverId(null);return}
    onUpdateManager(draggingId,'managerId',targetId)
    setDraggingId(null); setDragOverId(null)
  }

  const svgW = Math.max(totalW+300, 800)
  const svgH = Math.max(totalH+300, 600)

  return (
    <div ref={outerRef} style={{flex:1, position:'relative', overflow:'hidden',
      background:'var(--surface-2)',
      backgroundImage:'radial-gradient(circle, var(--border) 1px, transparent 1px)',
      backgroundSize:'22px 22px',
    }}>
      {/* Top-right controls */}
      <div style={{position:'absolute', top:16, right:16, zIndex:10, display:'flex', gap:6}}>
        {([['V','Şaquli'],['H','Üfüqi']] as [Dir,string][]).map(([d,label])=>(
          <button key={d} onClick={()=>setDir(d)} style={{
            padding:'7px 16px', borderRadius:8,
            background: dir===d?'var(--primary)':'var(--surface)',
            color: dir===d?'#fff':'var(--ink)',
            border:`1px solid ${dir===d?'var(--primary)':'var(--border)'}`,
            fontSize:12, fontWeight:700, cursor:'pointer',
            boxShadow:'0 1px 4px rgba(0,0,0,0.07)',
          }}>{label}</button>
        ))}
        <div style={{width:1, background:'var(--border)', margin:'0 2px'}}/>
        <button onClick={()=>setCollapsed(new Set(Array.from(childMap.keys())))} style={{
          padding:'7px 14px', borderRadius:8,
          background:'var(--surface)', color:'var(--ink)',
          border:'1px solid var(--border)', fontSize:12, fontWeight:700, cursor:'pointer',
        }}>Hamısını Qat</button>
        <button onClick={()=>setCollapsed(new Set())} style={{
          padding:'7px 14px', borderRadius:8,
          background:'var(--surface)', color:'var(--ink)',
          border:'1px solid var(--border)', fontSize:12, fontWeight:700, cursor:'pointer',
        }}>Hamısını Aç</button>
        <button onClick={toggleFullscreen} title={isFullscreen?'Tam ekrandan çıx':'Tam ekran'} style={{
          width:34, height:34, borderRadius:8,
          background:'var(--surface)', color:'var(--ink)',
          border:'1px solid var(--border)', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <span className="material-symbols-rounded" style={{fontSize:16}}>
            {isFullscreen?'fullscreen_exit':'fullscreen'}
          </span>
        </button>
      </div>

      {/* Left control panel */}
      <div style={{position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', zIndex:10,
        display:'flex', flexDirection:'column', alignItems:'center', gap:4,
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:12, padding:'8px 6px',
        boxShadow:'0 2px 12px rgba(0,0,0,0.08)',
      }}>
        <div style={{fontSize:11, fontWeight:800, color:'var(--primary)', marginBottom:4}}>
          {Math.round(tf.scale*100)}%
        </div>
        {[
          {icon:'add',action:()=>zoom(0.1),title:'Böyüt'},
          {icon:'remove',action:()=>zoom(-0.1),title:'Kiçilt'},
          {icon:'center_focus_strong',action:centerView,title:'Mərkəzləşdir'},
          {icon:'fit_screen',action:centerView,title:'Ekrana sığdır'},
        ].map(b=>(
          <button key={b.icon} onClick={b.action} title={b.title} style={{
            width:32, height:32, borderRadius:8, border:'none',
            background:'transparent', color:'var(--ink-2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}
          >
            <span className="material-symbols-rounded" style={{fontSize:18}}>{b.icon}</span>
          </button>
        ))}
      </div>

      {/* Root drop zone */}
      <div
        onDragOver={e=>{e.preventDefault();setDragOverId('__root__')}}
        onDragLeave={()=>setDragOverId(null)}
        onDrop={e=>{e.preventDefault();if(draggingId){onUpdateManager(draggingId,'managerId',null);setDraggingId(null);setDragOverId(null)}}}
        style={{
          position:'absolute', bottom:16, right:16, zIndex:10,
          padding:'7px 14px', borderRadius:9,
          border:`2px dashed ${dragOverId==='__root__'?'var(--primary)':'var(--border)'}`,
          background:dragOverId==='__root__'?'var(--primary-soft)':'var(--surface)',
          color:dragOverId==='__root__'?'var(--primary)':'var(--muted)',
          fontSize:11, fontWeight:700, transition:'all .15s',
        }}
      >
        <span className="material-symbols-rounded" style={{fontSize:12, marginRight:4}}>upload</span>
        Rəhbərsiz et
      </div>

      {/* Legend */}
      <div style={{
        position:'absolute', bottom:16, left:60, zIndex:10,
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:10, padding:'8px 12px',
        display:'flex', gap:12, fontSize:10, boxShadow:'0 1px 6px rgba(0,0,0,0.06)',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:6}}>
          <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#94A3B8" strokeWidth="1.5" markerEnd="url(#arr)"/></svg>
          <span style={{color:'var(--muted)', fontWeight:600}}>Birbaşa rəhbər</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:6}}>
          <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="4 2"/></svg>
          <span style={{color:'var(--muted)', fontWeight:600}}>Funksional rəhbər</span>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{width:'100%', height:'100%',
        cursor:panning?'grabbing':'grab', overflow:'hidden'}}
        onWheel={onWheel} onMouseDown={onMD} onMouseMove={onMM}
        onMouseUp={onMU} onMouseLeave={onMU}
      >
        <div style={{
          transform:`translate(${tf.x}px,${tf.y}px) scale(${tf.scale})`,
          transformOrigin:'0 0', position:'relative',
          width:svgW, height:svgH,
        }}>
          <OrgLines positions={positions} childMap={childMap}
            collapsed={collapsed} members={members} dir={dir} rowGroupsMap={rowGroupsMap}/>

          {members.map(m=>{
            const pos=positions.get(m.id); if(!pos) return null
            const children=childMap.get(m.id)||[]
            const mgr=members.find(x=>x.id===m.managerId)
            return (
              <div key={m.id} data-node="1"
                style={{position:'absolute', left:pos.x, top:pos.y}}>
                <NodeCard
                  member={m} level={levels.get(m.id)||1}
                  childCount={children.length}
                  isCollapsed={collapsed.has(m.id)}
                  isOver={dragOverId===m.id&&draggingId!==m.id}
                  isDragging={draggingId===m.id} dir={dir}
                  hasParent={!!mgr}
                  onDragStart={()=>setDraggingId(m.id)}
                  onDragOver={e=>{e.preventDefault();setDragOverId(m.id)}}
                  onDragLeave={()=>setDragOverId(null)}
                  onDrop={e=>handleDrop(e,m.id)}
                  onToggle={()=>setCollapsed(prev=>{const n=new Set(prev);n.has(m.id)?n.delete(m.id):n.add(m.id);return n})}
                  onClick={()=>setSelectedMember(m)}
                  onScrollToParent={()=>mgr&&scrollToNode(mgr.id)}
                />
              </div>
            )
          })}
        </div>
      </div>

      {selectedMember&&<MemberModal member={selectedMember} members={members} onClose={()=>setSelectedMember(null)}/>}
    </div>
  )
}

// ─── List Tab ─────────────────────────────────────────────────────────────────

function ManagerSel({value,members,excludeId,placeholder,onChange,accent}:{
  value:string;members:TeamMember[];excludeId:string
  placeholder:string;onChange:(v:string)=>void;accent?:string
}) {
  const ac=accent||'var(--primary)'
  return (
    <div style={{position:'relative',flex:1,minWidth:160}}>
      <span className="material-symbols-rounded" style={{
        position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',
        fontSize:13,color:ac,pointerEvents:'none',zIndex:1,
      }}>account_tree</span>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{
        width:'100%',padding:'8px 28px 8px 28px',
        border:`1.5px solid var(--border)`,borderRadius:10,
        background:'var(--surface)',color:'var(--ink)',
        fontSize:12,fontWeight:600,outline:'none',cursor:'pointer',
        appearance:'none',WebkitAppearance:'none',
      }}>
        <option value="">— {placeholder} —</option>
        {members.filter(m=>m.id!==excludeId).map(m=>(
          <option key={m.id} value={m.id}>{m.name}{m.role?` (${m.role})`:''}</option>
        ))}
      </select>
      <span className="material-symbols-rounded" style={{
        position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
        fontSize:13,color:'var(--muted)',pointerEvents:'none',
      }}>expand_more</span>
    </div>
  )
}

function ListTab({members,onUpdate}:{
  members:TeamMember[]
  onUpdate:(id:string,field:'managerId'|'functionalManagerId',val:string|null)=>void
}) {
  const [search,setSearch]=useState('')
  const filtered=members.filter(m=>
    m.name.toLowerCase().includes(search.toLowerCase())||
    (m.position||m.role||'').toLowerCase().includes(search.toLowerCase())||
    (m.company||'').toLowerCase().includes(search.toLowerCase())||
    (m.department||'').toLowerCase().includes(search.toLowerCase())||
    (m.personalCode||'').toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{position:'relative'}}>
        <span className="material-symbols-rounded" style={{
          position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',
          fontSize:16,color:'var(--muted)',pointerEvents:'none',
        }}>search</span>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="İşçi axtar..."
          style={{width:'100%',padding:'10px 14px 10px 38px',
            border:'1.5px solid var(--border)',borderRadius:12,
            background:'var(--surface)',color:'var(--ink)',
            fontSize:13,outline:'none',boxSizing:'border-box'}}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',
        gap:12,padding:'4px 16px',
        fontSize:10,fontWeight:800,color:'var(--muted)',
        textTransform:'uppercase',letterSpacing:'0.08em'}}>
        <span>İşçi</span><span>Birbaşa rəhbər</span><span>Funksional rəhbər</span>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {filtered.map(m=>{
          const[c1,c2]=pal(m.id); const dc=deptCol(m.department||'x')
          return (
            <div key={m.id} style={{
              display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',
              gap:12,alignItems:'center',
              padding:'12px 16px',borderRadius:14,
              background:'var(--surface)',border:'1px solid var(--border)',
              transition:'box-shadow .15s',
            }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow=''}
            >
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{
                  width:42,height:42,borderRadius:12,flexShrink:0,
                  background:`linear-gradient(135deg,${c1},${c2})`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  color:'#fff',fontSize:14,fontWeight:800,
                  boxShadow:`0 4px 10px ${c1}40`,
                }}>{initials(m.name)}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:800,color:'var(--ink)',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {m.name}
                  </div>
                  <div style={{fontSize:11,color:'var(--ink-2)',marginTop:1,
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {m.position||m.role||'—'}
                  </div>
                  {m.company&&<span style={{
                    display:'inline-flex',alignItems:'center',gap:3,marginTop:4,
                    padding:'2px 6px',borderRadius:5,
                    background:dc+'15',color:dc,fontSize:9,fontWeight:700,
                  }}>{m.company}</span>}
                </div>
              </div>
              <ManagerSel value={m.managerId??''} members={members} excludeId={m.id}
                placeholder="Birbaşa rəhbər yoxdur"
                onChange={v=>onUpdate(m.id,'managerId',v||null)}/>
              <ManagerSel value={m.functionalManagerId??''} members={members} excludeId={m.id}
                placeholder="Funksional rəhbər yoxdur"
                onChange={v=>onUpdate(m.id,'functionalManagerId',v||null)}
                accent="#8B5CF6"/>
            </div>
          )
        })}
        {!filtered.length&&(
          <div style={{padding:'48px 20px',textAlign:'center',color:'var(--muted)',fontSize:13}}>
            İşçi tapılmadı
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const { members, loading } = useTeam()
  const [local, setLocal] = useState<TeamMember[]>([])
  const [tab, setTab] = useState<'list'|'chart'>('chart')

  useEffect(()=>{ setLocal(members) },[members])

  const updateManager = useCallback(async(
    id:string, field:'managerId'|'functionalManagerId', val:string|null
  )=>{
    setLocal(prev=>prev.map(m=>m.id===id?{...m,[field]:val??undefined}:m))
    const res = await db.team.update(id,{[field]:val??null})
    if(!res.success){toast.error('Saxlanmadı');setLocal(members)}
    else toast.success(field==='managerId'?'Birbaşa rəhbər yeniləndi':'Funksional rəhbər yeniləndi')
  },[members])

  const placed=local.filter(m=>m.managerId&&local.some(x=>x.id===m.managerId)).length
  const depts=new Set(local.map(m=>m.department).filter(Boolean)).size

  const chartContent = (
    <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0,overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'14px 20px 12px',borderBottom:'1px solid var(--border)',
        background:'var(--surface)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:'var(--primary-soft)',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span className="material-symbols-rounded" style={{fontSize:19,color:'var(--primary)'}}>account_tree</span>
            </div>
            <div>
              <h1 style={{fontSize:18,fontWeight:800,color:'var(--ink)',letterSpacing:'-0.03em',margin:0}}>Org Chart</h1>
              <p style={{color:'var(--muted)',fontSize:11,margin:0}}>Komanda iyerarxiyasını idarə edin</p>
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            {[
              {icon:'groups',label:`${local.length} İşçi`,c:'var(--primary)',bg:'var(--primary-soft)'},
              {icon:'manage_accounts',label:`${placed} Manager`,c:'#10B981',bg:'rgba(16,185,129,0.1)'},
              {icon:'business',label:`${depts} Şöbə`,c:'#F59E0B',bg:'rgba(245,158,11,0.1)'},
            ].map(s=>(
              <div key={s.label} style={{display:'flex',alignItems:'center',gap:5,
                padding:'5px 11px',borderRadius:8,background:s.bg,color:s.c,
                fontSize:11,fontWeight:700}}>
                <span className="material-symbols-rounded" style={{fontSize:13}}>{s.icon}</span>
                {s.label}
              </div>
            ))}
            <div style={{display:'flex',background:'var(--surface-2)',
              borderRadius:9,padding:3,gap:2,marginLeft:4}}>
              {(['chart','list'] as const).map(t=>(
                <button key={t} onClick={()=>setTab(t)} style={{
                  padding:'5px 12px',borderRadius:7,
                  fontSize:11,fontWeight:700,cursor:'pointer',
                  color:tab===t?'var(--ink)':'var(--muted)',
                  background:tab===t?'var(--surface)':'transparent',
                  boxShadow:tab===t?'var(--shadow-sm)':'none',
                  display:'flex',alignItems:'center',gap:5,
                }}>
                  <span className="material-symbols-rounded" style={{fontSize:13}}>
                    {t==='chart'?'account_tree':'view_list'}
                  </span>
                  {t==='chart'?'Vizual':'Siyahı'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {tab==='chart'?(
        <VisualChart members={local} onUpdateManager={updateManager}/>
      ):(
        <div style={{flex:1,overflowY:'auto',padding:20}}>
          {loading?(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[...Array(5)].map((_,i)=>(
                <div key={i} className="skeleton" style={{height:68,borderRadius:14}}/>
              ))}
            </div>
          ):(
            <ListTab members={local} onUpdate={updateManager}/>
          )}
        </div>
      )}
    </div>
  )

  return chartContent
}
