import requests
from bs4 import BeautifulSoup

def decode_secret_message(url):
    # Step 1: Google Doc fetch karo
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Step 2: Plain text nikalo
    text = soup.get_text()
    lines = text.strip().split('\n')
    
    # Step 3: x, y, character parse karo
    grid_data = {}
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) == 3:
            try:
                x = int(parts[0])
                y = int(parts[1])
                char = parts[2]
                grid_data[(x, y)] = char
            except ValueError:
                continue
    
    if not grid_data:
        print("No data found!")
        return
    
    # Step 4: Grid dimensions nikalo
    max_x = max(coord[0] for coord in grid_data)
    max_y = max(coord[1] for coord in grid_data)
    
    # Step 5: y=0 bottom-left hai, isliye reverse print karo
    for y in range(max_y, -1, -1):
        row = ''
        for x in range(max_x + 1):
            row += grid_data.get((x, y), ' ')
        print(row)

# Run karo
decode_secret_message("https://docs.google.com/document/d/e/2PACX-1vTMOmshQe8YvaRXi6gEPKKlsC6UpFJSMAk4mQjLm_u1gmHdVVTaeh7nBNFBRlui0sTZ-snGwZM4DBCT/pub")