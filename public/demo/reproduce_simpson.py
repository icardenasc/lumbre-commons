#!/usr/bin/env python3
"""Lumbre editorial demonstration: deterministic synthetic Simpson reversal.
Python 3, standard library only. Run in any writable directory:
    python3 reproduce_simpson.py --output demo-output
No observations of people or real model performance are represented.
"""
import argparse, csv, hashlib, json
from fractions import Fraction
from pathlib import Path

CELLS = [('A','easy',100,90), ('A','hard',100,30), ('B','easy',900,720), ('B','hard',100,20)]
LABELS = {
'es':('Una comparación puede cambiar de signo','Tasa de éxito · datos sintéticos','Fáciles','Difíciles','Agregado','Pesos 50/50','Método A','Método B','DEMO EDITORIAL · 1.200 registros construidos · sin datos de personas'),
'en':('A comparison can reverse direction','Success rate · synthetic data','Easy','Hard','Pooled','50/50 weights','Method A','Method B','EDITORIAL DEMO · 1,200 constructed records · no human participant data'),
'pt':('Uma comparação pode mudar de sinal','Taxa de sucesso · dados sintéticos','Fáceis','Difíceis','Agregado','Pesos 50/50','Método A','Método B','DEMONSTRAÇÃO EDITORIAL · 1.200 registros construídos · sem dados pessoais'),
'fr':('Une comparaison peut changer de sens','Taux de réussite · données synthétiques','Faciles','Difficiles','Agrégé','Poids 50/50','Méthode A','Méthode B','DÉMONSTRATION ÉDITORIALE · 1 200 lignes construites · aucune donnée de personnes')
}
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',default='demo-output');args=parser.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
 rows=[]
 for method,difficulty,total,successes in CELLS:
  for i in range(total): rows.append({'id':f'{method}-{difficulty}-{i+1:04d}','method':method,'difficulty':difficulty,'success':int(i<successes)})
 csv_path=out/'simpson-data.csv'
 with csv_path.open('w',newline='',encoding='utf-8') as f:
  writer=csv.DictWriter(f,fieldnames=['id','method','difficulty','success']);writer.writeheader();writer.writerows(rows)
 # Read the written artifact back; reported results are recomputed from the CSV.
 with csv_path.open(newline='',encoding='utf-8') as f: parsed=list(csv.DictReader(f))
 def rate(method,difficulty=None):
  selected=[r for r in parsed if r['method']==method and (difficulty is None or r['difficulty']==difficulty)]
  return Fraction(sum(int(r['success']) for r in selected),len(selected))
 summary={m:{d:float(rate(m,d if d!='pooled' else None)) for d in ['easy','hard','pooled']} for m in ['A','B']}
 for m in summary: summary[m]['standardized_50_50']=float((rate(m,'easy')+rate(m,'hard'))/2);summary[m]['standardized_5_6_1_6']=float(Fraction(5,6)*rate(m,'easy')+Fraction(1,6)*rate(m,'hard'))
 assert len(parsed)==1200
 assert rate('A','easy')-rate('B','easy')==Fraction(1,10)
 assert rate('A','hard')-rate('B','hard')==Fraction(1,10)
 assert rate('A')-rate('B')==Fraction(-14,100)
 result={'demonstration':True,'generation':'deterministic constructed cells, no random draws','records':len(parsed),'successes':sum(int(r['success']) for r in parsed),'cells':[{'method':m,'difficulty':d,'n':n,'successes':s} for m,d,n,s in CELLS],'rates':summary,'pooled_difference_percentage_points':float((rate('A')-rate('B'))*100),'common_weight_difference_percentage_points':10,'reversal_condition':'p_B - p_A > 1/6, for the cell rates specified here','csv_sha256':hashlib.sha256(csv_path.read_bytes()).hexdigest()}
 (out/'simpson-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 for lang,labels in LABELS.items():
  title,subtitle,*rest=labels;groups=rest[:4];a_label,b_label,note=rest[4:]
  vals=[(.9,.8),(.3,.2),(.6,.74),(.6,.5)]
  svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 690" role="img" aria-labelledby="title desc">',f'<title id="title">{title}</title><desc id="desc">{subtitle}. A: 90%, 30%, 60%, 60%. B: 80%, 20%, 74%, 50%. {note}.</desc>','<rect width="1000" height="690" fill="#f6f3ec"/>',f'<text x="64" y="62" font-family="Georgia,serif" font-size="32" fill="#22231f">{title}</text>',f'<text x="64" y="94" font-family="sans-serif" font-size="15" fill="#656b61">{subtitle}</text>']
  for pct in range(0,101,20):
   y=525-3.5*pct;svg.extend([f'<line x1="90" y1="{y}" x2="935" y2="{y}" stroke="#d4d7ce"/>',f'<text x="73" y="{y+5}" text-anchor="end" font-family="sans-serif" font-size="12" fill="#656b61">{pct}%</text>'])
  for i,(va,vb) in enumerate(vals):
   x=145+i*210
   for dx,value,color in [(0,va,'#253ca3'),(62,vb,'#d26946')]:
    h=value*350;svg.append(f'<rect x="{x+dx}" y="{525-h}" width="48" height="{h}" fill="{color}"/>');svg.append(f'<text x="{x+dx+24}" y="{515-h}" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="{color}">{value*100:g}%</text>')
   svg.append(f'<text x="{x+55}" y="557" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#22231f">{groups[i]}</text>')
  svg.extend(['<rect x="90" y="595" width="14" height="14" fill="#253ca3"/>',f'<text x="113" y="607" font-family="sans-serif" font-size="14" fill="#22231f">{a_label}</text>','<rect x="265" y="595" width="14" height="14" fill="#d26946"/>',f'<text x="288" y="607" font-family="sans-serif" font-size="14" fill="#22231f">{b_label}</text>',f'<text x="64" y="655" font-family="sans-serif" font-size="11" fill="#656b61">{note}</text>','</svg>'])
  (out/f'simpson-{lang}.svg').write_text('\n'.join(svg),encoding='utf-8')
 print(json.dumps(result,indent=2))
if __name__=='__main__':main()
