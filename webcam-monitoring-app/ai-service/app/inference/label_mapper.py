def _normalize_name(name: str) -> str:
    return (name or '').strip().lower().replace('-', ' ').replace('_', ' ')


def build_smoking_label_map(names_by_id: dict) -> dict:
    """
    Returns mapping: class_id -> one of {'cigarettes', 'vape'} based on the model's native `names`.
    """
    label_map = {}
    for class_id, raw_name in (names_by_id or {}).items():
        n = _normalize_name(str(raw_name))
        if 'vape' in n:
            label_map[int(class_id)] = 'vape'
        elif 'cig' in n:
            label_map[int(class_id)] = 'cigarettes'

    return label_map


def build_drowsiness_label_map(names_by_id: dict) -> dict:
    """
    Returns mapping: class_id -> one of {'awake', 'drowsy'} based on the model's native `names`.
    """
    label_map = {}
    for class_id, raw_name in (names_by_id or {}).items():
        n = _normalize_name(str(raw_name))
        if 'drows' in n:
            label_map[int(class_id)] = 'drowsy'
        elif 'awake' in n:
            label_map[int(class_id)] = 'awake'
    return label_map

