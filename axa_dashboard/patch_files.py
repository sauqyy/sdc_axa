import os
import pandas as pd
import numpy as np
import json
import re

excel_path = "../Study Case for Univ Airlangga 2026 _Actuarial AXA (Sent 2026.05.26).xlsx"

df_prem = pd.read_excel(excel_path, sheet_name='Raw Premium')
df_claim = pd.read_excel(excel_path, sheet_name='Raw Claim')

# Product mapping
policy_product_map = df_prem.groupby('POLICY_NO')['PRODUCT_NAME'].first().to_dict()
df_claim['PRODUCT_NAME'] = df_claim['POLICY_NO'].map(policy_product_map).fillna('UNKNOWN PRODUCT')

df_claim['gross_incurred'] = df_claim['GRS_ST_IDR'] + df_claim['GRS_OS_IDR']
df_claim['net_incurred'] = (df_claim['GRS_ST_IDR'] - df_claim['RI_ST_IDR']) + (df_claim['GRS_OS_IDR'] - df_claim['RI_OS_IDR'])

def get_aggregated_dimensions(dims):
    p_agg = df_prem.groupby(dims).agg(
        GWP=('GWP_IDR', 'sum'),
        RWP=('RWP_IDR', 'sum'),
        Exposure=('SUM_INSURED', 'sum')
    ).reset_index()

    c_agg = df_claim.groupby(dims).agg(
        Gross_Claims=('gross_incurred', 'sum'),
        Net_Claims=('net_incurred', 'sum'),
        Claim_Count=('CLM_REF', 'count')
    ).reset_index()

    merged = pd.merge(p_agg, c_agg, on=dims, how='outer').fillna(0)
    merged['NWP'] = merged['GWP'] - merged['RWP']
    merged['Loss_Ratio_Gross'] = (merged['Gross_Claims'] / merged['GWP']) * 100
    merged['Loss_Ratio_Net'] = np.where(merged['NWP'] > 0, (merged['Net_Claims'] / merged['NWP']) * 100, 0)
    merged['Claim_Severity_Gross'] = np.where(merged['Claim_Count'] > 0, merged['Gross_Claims'] / merged['Claim_Count'], 0)
    merged['Claim_Severity_Net'] = np.where(merged['Claim_Count'] > 0, merged['Net_Claims'] / merged['Claim_Count'], 0)
    return merged

def to_worst_list(df_in, dim_keys):
    res = []
    for _, r in df_in.iterrows():
        item = {
            "cob": str(r['COB']),
            "gwp": round(float(r['GWP']), 2),
            "nwp": round(float(r['NWP']), 2),
            "exposure": round(float(r['Exposure']), 2),
            "grossClaims": round(float(r['Gross_Claims']), 2),
            "netClaims": round(float(r['Net_Claims']), 2),
            "claimCount": int(r['Claim_Count']),
            "lossRatioGross": round(float(r['Loss_Ratio_Gross']), 2),
            "lossRatioNet": round(float(r['Loss_Ratio_Net']), 2),
            "severityGross": round(float(r['Claim_Severity_Gross']), 2),
            "severityNet": round(float(r['Claim_Severity_Net']), 2),
            # For backward compatibility
            "lossRatio": round(float(r['Loss_Ratio_Gross']), 2),
            "severity": round(float(r['Claim_Severity_Gross']), 2)
        }
        for k in dim_keys:
            key_name = k.lower().rstrip('_')
            item[key_name] = str(r[k])
        res.append(item)
    return res

def get_worst_list(dims, dim_keys, limit=None, basis='gross'):
    df_dim = get_aggregated_dimensions(dims)
    sort_col = 'Loss_Ratio_Gross' if basis == 'gross' else 'Loss_Ratio_Net'
    df_dim = df_dim[df_dim['GWP'] > 1e8].sort_values(sort_col, ascending=False)
    if limit is not None:
        df_dim = df_dim.head(limit)
    return to_worst_list(df_dim, dim_keys)

def get_granual_worst(basis='gross'):
    df_all = get_aggregated_dimensions(['COB', 'BRANCH_', 'CHANNEL_', 'PRODUCT_NAME'])
    sort_col = 'Loss_Ratio_Gross' if basis == 'gross' else 'Loss_Ratio_Net'
    df_all = df_all[df_all['GWP'] > 1e8].sort_values(sort_col, ascending=False).head(10)

    granual_list = []
    for idx, r in df_all.iterrows():
        impact_note = "High Loss Ratio"
        lr_val = r['Loss_Ratio_Gross'] if basis == 'gross' else r['Loss_Ratio_Net']
        if r['COB'] == 'COB 6' and r['PRODUCT_NAME'] == 'PRODUCT1217':
            impact_note = "Primary Root Cause (29.58% of entire AXA claims)"
        elif r['COB'] == 'COB 6' and r['PRODUCT_NAME'] == 'PRODUCT1221':
            impact_note = "Extreme claim count (971 claims for small GWP)"
        elif r['COB'] == 'COB 7' and r['PRODUCT_NAME'] == 'PRODUCT0221':
            impact_note = "Secondary Root Cause (14.36% of entire AXA claims)"
        elif lr_val >= 100:
            impact_note = "Extreme Underwriting Deficit"

        granual_list.append({
            "cob": str(r['COB']),
            "branch": str(r['BRANCH_']),
            "channel": str(r['CHANNEL_']),
            "product": str(r['PRODUCT_NAME']),
            "gwp": round(float(r['GWP']), 2),
            "nwp": round(float(r['NWP']), 2),
            "exposure": round(float(r['Exposure']), 2),
            "grossClaims": round(float(r['Gross_Claims']), 2),
            "netClaims": round(float(r['Net_Claims']), 2),
            "claimCount": int(r['Claim_Count']),
            "lossRatioGross": round(float(r['Loss_Ratio_Gross']), 2),
            "lossRatioNet": round(float(r['Loss_Ratio_Net']), 2),
            "severityGross": round(float(r['Claim_Severity_Gross']), 2),
            "severityNet": round(float(r['Claim_Severity_Net']), 2),
            # For compatibility
            "lossRatio": round(float(r['Loss_Ratio_Gross'] if basis == 'gross' else r['Loss_Ratio_Net']), 2),
            "impact": impact_note
        })
    return granual_list

# Format all combinations
worst_segments = {
    "gross": {
        "cobBranch": get_worst_list(['COB', 'BRANCH_'], ['BRANCH_'], basis='gross', limit=None),
        "cobChannel": get_worst_list(['COB', 'CHANNEL_'], ['CHANNEL_'], basis='gross', limit=None),
        "cobProduct": get_worst_list(['COB', 'PRODUCT_NAME'], ['PRODUCT_NAME'], basis='gross', limit=None),
        "cobBranchChannel": get_worst_list(['COB', 'BRANCH_', 'CHANNEL_'], ['BRANCH_', 'CHANNEL_'], basis='gross', limit=None),
        "cobBranchChannelProduct": get_worst_list(['COB', 'BRANCH_', 'CHANNEL_', 'PRODUCT_NAME'], ['BRANCH_', 'CHANNEL_', 'PRODUCT_NAME'], basis='gross', limit=None),
        "granualWorst": get_granual_worst(basis='gross')
    },
    "net": {
        "cobBranch": get_worst_list(['COB', 'BRANCH_'], ['BRANCH_'], basis='net', limit=None),
        "cobChannel": get_worst_list(['COB', 'CHANNEL_'], ['CHANNEL_'], basis='net', limit=None),
        "cobProduct": get_worst_list(['COB', 'PRODUCT_NAME'], ['PRODUCT_NAME'], basis='net', limit=None),
        "cobBranchChannel": get_worst_list(['COB', 'BRANCH_', 'CHANNEL_'], ['BRANCH_', 'CHANNEL_'], basis='net', limit=None),
        "cobBranchChannelProduct": get_worst_list(['COB', 'BRANCH_', 'CHANNEL_', 'PRODUCT_NAME'], ['BRANCH_', 'CHANNEL_', 'PRODUCT_NAME'], basis='net', limit=None),
        "granualWorst": get_granual_worst(basis='net')
    }
}

# 2. Patch app.py FALLBACK_DATA["worstSegments"]
with open('app.py', 'r', encoding='utf-8') as f:
    app_code = f.read()

# We need to find the worstSegments block in FALLBACK_DATA and replace it
# We can find it using a regex or search.
# Let's locate the exact start and end of "worstSegments": { ... } inside FALLBACK_DATA
start_marker = '  "worstSegments": {'
end_marker = '  "recommendations": ['

start_idx = app_code.find(start_marker)
end_idx = app_code.find(end_marker)

if start_idx != -1 and end_idx != -1:
    # Build replacement block
    ws_json = json.dumps(worst_segments, indent=4)
    # format indentation to match app.py
    indented_ws = '\n'.join('    ' + line if line else '' for line in ws_json.split('\n'))
    replacement = '  "worstSegments": ' + indented_ws.strip() + ',\n'
    
    new_app_code = app_code[:start_idx] + replacement + app_code[end_idx:]
    with open('app.py', 'w', encoding='utf-8') as f:
        f.write(new_app_code)
    print("Successfully patched app.py!")
else:
    print("Error: Could not find worstSegments markers in app.py")

# 3. Patch static/js/data.js worstSegments
with open('static/js/data.js', 'r', encoding='utf-8') as f:
    data_code = f.read()

start_marker_js = '  worstSegments: {'
end_marker_js = '  recommendations: ['

start_idx_js = data_code.find(start_marker_js)
end_idx_js = data_code.find(end_marker_js)

if start_idx_js != -1 and end_idx_js != -1:
    ws_json_js = json.dumps(worst_segments, indent=2)
    # format indentation
    indented_ws_js = '\n'.join('  ' + line if line else '' for line in ws_json_js.split('\n'))
    replacement_js = '  worstSegments: ' + indented_ws_js.strip() + ',\n'
    
    new_data_code = data_code[:start_idx_js] + replacement_js + data_code[end_idx_js:]
    with open('static/js/data.js', 'w', encoding='utf-8') as f:
        f.write(new_data_code)
    print("Successfully patched data.js!")
else:
    print("Error: Could not find worstSegments markers in data.js")
