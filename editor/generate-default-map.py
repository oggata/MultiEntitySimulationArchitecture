#!/usr/bin/env python3
import json

def generate_default_map():
    """128x128のデフォルトマップを生成"""
    grid_size = 128
    grid_data = []
    
    # 空のグリッドを初期化
    for y in range(grid_size):
        row = []
        for x in range(grid_size):
            row.append("empty")
        grid_data.append(row)
    
    # 主要道路（縦横のメインストリート）
    # 縦の道路
    for y in range(grid_size):
        grid_data[y][0] = "road"      # 左端
        grid_data[y][grid_size-1] = "road"  # 右端
        if y % 20 == 0:  # 20マスごとに縦の道路
            for x in range(grid_size):
                grid_data[y][x] = "road"
    
    # 横の道路
    for x in range(grid_size):
        grid_data[0][x] = "road"      # 上端
        grid_data[grid_size-1][x] = "road"  # 下端
        if x % 20 == 0:  # 20マスごとに横の道路
            for y in range(grid_size):
                grid_data[y][x] = "road"
    
    # 住宅地を配置
    for y in range(1, grid_size-1):
        for x in range(1, grid_size-1):
            if grid_data[y][x] == "empty":
                # 道路から離れた場所に住宅地を配置
                if x % 20 > 2 and x % 20 < 18 and y % 20 > 2 and y % 20 < 18:
                    grid_data[y][x] = "residential"
    
    # 大サイズ施設（8x8）を配置
    facilities_large = [
        ("facility:公園|dir:up", 2, 2),
        ("facility:学校|dir:right", 22, 2),
        ("facility:病院|dir:down", 42, 2),
        ("facility:スーパーマーケット|dir:left", 62, 2),
        ("facility:図書館|dir:up", 82, 2),
        ("facility:スポーツジム|dir:right", 102, 2),
        ("facility:町の広場|dir:down", 2, 22),
        ("facility:公園|dir:left", 22, 22),
        ("facility:学校|dir:up", 42, 22),
        ("facility:病院|dir:right", 62, 22),
        ("facility:スーパーマーケット|dir:down", 82, 22),
        ("facility:図書館|dir:left", 102, 22),
        ("facility:スポーツジム|dir:up", 2, 42),
        ("facility:町の広場|dir:right", 22, 42),
        ("facility:公園|dir:down", 42, 42),
        ("facility:学校|dir:left", 62, 42),
        ("facility:病院|dir:up", 82, 42),
        ("facility:スーパーマーケット|dir:right", 102, 42),
        ("facility:図書館|dir:down", 2, 62),
        ("facility:スポーツジム|dir:left", 22, 62),
        ("facility:町の広場|dir:up", 42, 62),
        ("facility:公園|dir:right", 62, 62),
        ("facility:学校|dir:down", 82, 62),
        ("facility:病院|dir:left", 102, 62),
        ("facility:スーパーマーケット|dir:up", 2, 82),
        ("facility:図書館|dir:right", 22, 82),
        ("facility:スポーツジム|dir:down", 42, 82),
        ("facility:町の広場|dir:left", 62, 82),
        ("facility:公園|dir:up", 82, 82),
        ("facility:学校|dir:right", 102, 82),
        ("facility:病院|dir:down", 2, 102),
        ("facility:スーパーマーケット|dir:left", 22, 102),
        ("facility:図書館|dir:up", 42, 102),
        ("facility:スポーツジム|dir:right", 62, 102),
        ("facility:町の広場|dir:down", 82, 102),
        ("facility:公園|dir:left", 102, 102)
    ]
    
    # 大サイズ施設を配置
    for facility, start_x, start_y in facilities_large:
        if start_x + 8 <= grid_size and start_y + 8 <= grid_size:
            for dy in range(8):
                for dx in range(8):
                    if start_y + dy < grid_size and start_x + dx < grid_size:
                        grid_data[start_y + dy][start_x + dx] = facility
    
    # 中サイズ施設（4x4）を配置
    facilities_medium = [
        ("facility:カフェ|dir:up", 12, 12),
        ("facility:ファミレス|dir:right", 32, 12),
        ("facility:銀行|dir:down", 52, 12),
        ("facility:郵便局|dir:left", 72, 12),
        ("facility:美容院|dir:up", 92, 12),
        ("facility:クリーニング店|dir:right", 12, 32),
        ("facility:薬局|dir:down", 32, 32),
        ("facility:本屋|dir:left", 52, 32),
        ("facility:コンビニ|dir:up", 72, 32),
        ("facility:カフェ|dir:right", 92, 32),
        ("facility:ファミレス|dir:down", 12, 52),
        ("facility:銀行|dir:left", 32, 52),
        ("facility:郵便局|dir:up", 52, 52),
        ("facility:美容院|dir:right", 72, 52),
        ("facility:クリーニング店|dir:down", 92, 52),
        ("facility:薬局|dir:left", 12, 72),
        ("facility:本屋|dir:up", 32, 72),
        ("facility:コンビニ|dir:right", 52, 72),
        ("facility:カフェ|dir:down", 72, 72),
        ("facility:ファミレス|dir:left", 92, 72),
        ("facility:銀行|dir:up", 12, 92),
        ("facility:郵便局|dir:right", 32, 92),
        ("facility:美容院|dir:down", 52, 92),
        ("facility:クリーニング店|dir:left", 72, 92),
        ("facility:薬局|dir:up", 92, 92)
    ]
    
    # 中サイズ施設を配置
    for facility, start_x, start_y in facilities_medium:
        if start_x + 4 <= grid_size and start_y + 4 <= grid_size:
            for dy in range(4):
                for dx in range(4):
                    if start_y + dy < grid_size and start_x + dx < grid_size:
                        grid_data[start_y + dy][start_x + dx] = facility
    
    # エディタが期待する形式: 配列の配列を直接返す
    return grid_data

if __name__ == "__main__":
    map_data = generate_default_map()
    
    # JSONファイルに保存
    with open("default-map.json", "w", encoding="utf-8") as f:
        json.dump(map_data, f, ensure_ascii=False, indent=0)
    
    print("デフォルトマップを生成しました: default-map.json")
    print(f"サイズ: {len(map_data)}x{len(map_data[0]) if map_data else 0}")
    
    # 統計情報
    total_cells = len(map_data) ** 2
    road_cells = sum(row.count('road') for row in map_data)
    residential_cells = sum(row.count('residential') for row in map_data)
    facility_cells = sum(1 for row in map_data for cell in row if 'facility:' in cell)
    empty_cells = sum(row.count('empty') for row in map_data)
    
    print(f"道路: {road_cells} マス")
    print(f"住宅地: {residential_cells} マス")
    print(f"施設: {facility_cells} マス")
    print(f"空地: {empty_cells} マス")
    print(f"合計: {total_cells} マス")
