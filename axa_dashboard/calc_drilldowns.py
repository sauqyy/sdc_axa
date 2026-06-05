import os
import pandas as pd
import numpy as np
import json

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
        Exposure=('SUM_INSURED', 'sum')
    ).reset_index()

    c_agg = df_claim.groupby(dims).agg(
        Gross_Claims=('gross_incurred', 'sum'),
        Net_Claims=('net_incurred', 'sum'),
        Claim_Count=('CLM_REF', 'count')
    ).reset_index()

    merged = pd.merge(p_agg, c_agg, on=dims, how='outer').fillna(0)
    merged['Loss_Ratio_Gross'] = (merged['Gross_Claims'] / merged['GWP']) * 100
    merged['Claim_Severity_Gross'] = np.where(merged['Claim_Count'] > 0, merged['Gross_Claims'] / merged['Claim_Count'], 0)
    return merged

def to_worst_list(df_in, dim_keys):
    res = []
    for _, r in df_in.iterrows():
        item = {
            "cob": str(r['COB']),
            "gwp": float(r['GWP']),
            "exposure": float(r['Exposure']),
            "grossClaims": float(r['Gross_Claims']),
            "netClaims": float(r['Net_Claims']),
            "claimCount": int(r['Claim_Count']),
            "lossRatio": round(float(r['Loss_Ratio_Gross']), 2),
            "severity": round(float(r['Claim_Severity_Gross']), 2)
        }
        for k in dim_keys:
            key_name = k.lower().rstrip('_')
            item[key_name] = str(r[k])
        res.append(item)
    return res

def get_worst_list(dims, dim_keys, limit=10):
    df_dim = get_aggregated_dimensions(dims)
    df_dim = df_dim[df_dim['GWP'] > 1e8].sort_values('Loss_Ratio_Gross', ascending=False).head(limit)
    return to_worst_list(df_dim, dim_keys)

# Calculate combinations
combinations = {
    "cobBranch": get_worst_list(['COB', 'BRANCH_'], ['BRANCH_']),
    "cobChannel": get_worst_list(['COB', 'CHANNEL_'], ['CHANNEL_']),
    "cobProduct": get_worst_list(['COB', 'PRODUCT_NAME'], ['PRODUCT_NAME']),
    "cobBranchChannel": get_worst_list(['COB', 'BRANCH_', 'CHANNEL_'], ['BRANCH_', 'CHANNEL_']),
    "cobBranchChannelProduct": get_worst_list(['COB', 'BRANCH_', 'CHANNEL_', 'PRODUCT_NAME'], ['BRANCH_', 'CHANNEL_', 'PRODUCT_NAME'])
}

print(json.dumps(combinations, indent=2))
