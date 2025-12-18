import base64
import os

def create_logos():
    font_path = 'assets/logo/PlayfairDisplay-Medium.ttf'
    with open(font_path, 'rb') as f:
        font_data = f.read()
        font_b64 = base64.b64encode(font_data).decode('utf-8')

    style = f"""<style>
    @font-face {{
        font-family: 'Playfair Display';
        font-style: normal;
        font-weight: 500;
        src: url(data:font/ttf;base64,{font_b64}) format('truetype');
    }}
    text {{ font-family: 'Playfair Display', serif; font-weight: 500; }}
  </style>"""

    # 1. Logo Black (SUKODA.)
    svg_black = f"""<svg width="240" height="60" viewBox="0 0 240 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  {style}
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="36" fill="#000000" letter-spacing="-0.02em">SUKODA.</text>
</svg>"""
    with open('assets/logo/logo-black.svg', 'w') as f:
        f.write(svg_black)

    # 2. Logo White (SUKODA.)
    svg_white = f"""<svg width="240" height="60" viewBox="0 0 240 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  {style}
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="36" fill="#FFFFFF" letter-spacing="-0.02em">SUKODA.</text>
</svg>"""
    with open('assets/logo/logo-white.svg', 'w') as f:
        f.write(svg_white)

    # 3. Icon Square Black (S.)
    svg_square = f"""<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  {style}
  <rect width="100" height="100" rx="20" fill="#000000"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="60" fill="#FFFFFF">S.</text>
</svg>"""
    with open('assets/logo/icon-square.svg', 'w') as f:
        f.write(svg_square)

    # 4. Icon Circle Black (S.)
    svg_circle = f"""<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  {style}
  <circle cx="50" cy="50" r="50" fill="#000000"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="60" fill="#FFFFFF">S.</text>
</svg>"""
    with open('assets/logo/icon-circle.svg', 'w') as f:
        f.write(svg_circle)

    # 5. Icon S Black (S.) - No background
    svg_s_black = f"""<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  {style}
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="60" fill="#000000">S.</text>
</svg>"""
    with open('assets/logo/icon-s-black.svg', 'w') as f:
        f.write(svg_s_black)

    # 6. Icon S White (S.) - No background
    svg_s_white = f"""<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  {style}
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="60" fill="#FFFFFF">S.</text>
</svg>"""
    with open('assets/logo/icon-s-white.svg', 'w') as f:
        f.write(svg_s_white)

    # 7. Icon Square White (S.) - NEW
    svg_square_white = f"""<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  {style}
  <rect width="100" height="100" rx="20" fill="#FFFFFF"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="60" fill="#000000">S.</text>
</svg>"""
    with open('assets/logo/icon-square-white.svg', 'w') as f:
        f.write(svg_square_white)
    
    # 8. Icon Circle White (S.) - NEW
    svg_circle_white = f"""<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  {style}
  <circle cx="50" cy="50" r="50" fill="#FFFFFF"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="60" fill="#000000">S.</text>
</svg>"""
    with open('assets/logo/icon-circle-white.svg', 'w') as f:
        f.write(svg_circle_white)

if __name__ == "__main__":
    create_logos()
    print("Logos updated with dot (.) and new white background versions created.")
