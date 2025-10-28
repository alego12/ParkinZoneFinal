#!/usr/bin/env python3
"""
Script para instalar PaddleOCR y dependencias
"""

import subprocess
import sys
import os

def install_package(package):
    """Instala un paquete usando pip"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✅ {package} instalado correctamente")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error instalando {package}: {e}")
        return False

def main():
    print("🚀 Instalando PaddleOCR y dependencias...")
    
    packages = [
        "paddlepaddle",
        "paddleocr",
        "opencv-python",
        "numpy",
        "pillow"
    ]
    
    success_count = 0
    
    for package in packages:
        if install_package(package):
            success_count += 1
    
    print(f"\n📊 Resumen: {success_count}/{len(packages)} paquetes instalados")
    
    if success_count == len(packages):
        print("🎉 ¡Todas las dependencias instaladas correctamente!")
        print("🤖 PaddleOCR está listo para usar")
    else:
        print("⚠️ Algunas dependencias fallaron. Revisa los errores arriba.")
    
    # Crear directorio temp si no existe
    temp_dir = os.path.join(os.path.dirname(__file__), 'temp')
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        print(f"📁 Directorio temporal creado: {temp_dir}")

if __name__ == "__main__":
    main()
