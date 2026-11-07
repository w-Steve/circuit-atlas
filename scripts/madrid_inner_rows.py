"""Estimated continuous GD row edges from raster ribbon radial sections."""
import numpy as np
from scipy.optimize import least_squares
from shapely.geometry import Polygon, LineString
from shapely.ops import unary_union

def rows_from_ribbons(arcs):
    polygons=[]
    for arc in arcs:
        polygons.append(unary_union([Polygon(r) for r in arc['sourceContoursPixels'] if Polygon(r).area>1]))
    points=np.concatenate([np.array(r) for a in arcs for r in a['sourceContoursPixels'] if Polygon(r).area>1])
    # This source-image center parameterizes the U-shaped ribbons; it is not a
    # physical track radius, road fit, or adjustment for visibility/clearance.
    fit=least_squares(lambda v:np.linalg.norm(points-v[:2],axis=1)-v[2],[1043,234,42])
    center=fit.x[:2]
    result=[]
    for arc,shape in zip(arcs,polygons):
        vertices=np.concatenate([np.array(r) for r in arc['sourceContoursPixels'] if Polygon(r).area>1])
        angle=np.unwrap(np.arctan2(vertices[:,1]-center[1],vertices[:,0]-center[0]))
        # Each bank spans less than pi, and none crosses the negative x axis.
        assert np.ptp(angle)<np.pi
        radius=np.median(np.linalg.norm(vertices-center,axis=1))
        theta=np.linspace(angle.min()+.7/radius,angle.max()-.7/radius,80)
        near=[];far=[]
        for t in theta:
            ray=np.array([np.cos(t),np.sin(t)])
            cut=shape.intersection(LineString([center,center+ray*100]))
            lines=[cut] if cut.geom_type=='LineString' else [g for g in getattr(cut,'geoms',[]) if g.geom_type=='LineString']
            assert lines, f'{arc["label"]}: missing source radial section'
            distances=np.concatenate([(np.array(g.coords)-center)@ray for g in lines])
            near.append(distances.min());far.append(distances.max())
        near,far=np.array(near),np.array(far)
        widths=far-near
        # Rounded raster caps and icon intrusions do not define individual rows.
        # Fit the visible thick part and report continuation uncertainty, rather
        # than letting a one-pixel letter notch produce a wire/slope spike.
        core=widths>=np.median(widths)*.7
        assert core.sum()>40
        back=np.polynomial.Polynomial.fit(theta[core],near[core],3)(theta)
        front=np.polynomial.Polynomial.fit(theta[core],far[core],3)(theta)
        assert np.min(front-back)>1
        direction=np.c_[np.cos(theta),np.sin(theta)]
        fp=center+direction*front[:,None];bp=center+direction*back[:,None]
        result.append({'label':arc['label'],'front':fp,'back':bp,
            'sourceCenter':center.tolist(),'coreSections':int(core.sum()),
            'maximumRadialContinuationPixels':float(max(np.max(abs(front-far)),np.max(abs(back-near)))),
            'coreFitRmsPixels':float(np.sqrt(np.mean(np.r_[front[core]-far[core],back[core]-near[core]]**2)))})
    return result
