from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import io
import os
import json
import logging
from logging.handlers import RotatingFileHandler
from functools import wraps
from config import get_config

# 获取配置
config = get_config()
app = Flask(__name__)
CORS(app)

# 配置日志
def setup_logger():
    if not os.path.exists(config.LOGS_DIR):
        os.makedirs(config.LOGS_DIR)
    
    file_handler = RotatingFileHandler(
        config.LOG_FILE,
        maxBytes=1024 * 1024,  # 1MB
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('应用启动')

# 错误处理装饰器
def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            app.logger.error(f'错误: {str(e)}')
            return jsonify({'error': str(e)}), 500
    return decorated_function

# 文件处理工具函数
class FileUtils:
    @staticmethod
    def is_allowed_file(filename):
        return os.path.splitext(filename)[1].lower() in config.ALLOWED_EXTENSIONS
    
    @staticmethod
    def get_mime_type(filename):
        ext = os.path.splitext(filename)[1].lower()
        mime_types = {
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg'
        }
        return mime_types.get(ext, 'image/jpeg')

    @staticmethod
    def normalize_path(path):
        # 统一使用正斜杠，避免Windows和Unix系统的路径分隔符差异
        return path.replace('\\', '/')

# 图片处理工具函数
class ImageUtils:
    @staticmethod
    def create_thumbnail(image):
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        width, height = image.size
        ratio = min(config.THUMBNAIL_SIZE/width, config.THUMBNAIL_SIZE/height)
        new_size = (int(width * ratio), int(height * ratio))
        
        return image.resize(new_size, Image.Resampling.LANCZOS)

# 路由
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/scan_folders', methods=['POST'])
@handle_errors
def scan_folders():
    folder_path = request.json.get('folder_path')
    if not folder_path:
        return jsonify({'error': '请提供文件夹路径'}), 400
    
    if not os.path.exists(folder_path):
        return jsonify({'error': '文件夹不存在'}), 404
    
    result = []
    for root, _, files in os.walk(folder_path):
        for file in files:
            if FileUtils.is_allowed_file(file):
                image_path = os.path.join(root, file)
                txt_path = os.path.splitext(image_path)[0] + '.txt'
                
                try:
                    if not os.path.exists(txt_path):
                        open(txt_path, 'a').close()
                    
                    with open(txt_path, 'r', encoding=config.FILE_ENCODING, errors=config.FILE_ERRORS) as f:
                        annotation = f.read()
                    
                    result.append({
                        'image_path': FileUtils.normalize_path(image_path),
                        'txt_path': FileUtils.normalize_path(txt_path),
                        'annotation': annotation
                    })
                except Exception as e:
                    app.logger.warning(f'处理文件出错: {str(e)}')
                    continue
    
    return jsonify(result)

@app.route('/thumbnail/<path:image_path>')
@handle_errors
def serve_thumbnail(image_path):
    # 移除开头的斜杠（如果存在）
    if image_path.startswith('/'):
        image_path = image_path[1:]
    
    # 确保路径是绝对路径
    if not os.path.isabs(image_path):
        image_path = os.path.abspath(image_path)
    
    if not os.path.exists(image_path):
        app.logger.warning(f'缩略图不存在: {image_path}')
        return '图片不存在', 404
    
    with Image.open(image_path) as img:
        thumbnail = ImageUtils.create_thumbnail(img)
        img_io = io.BytesIO()
        thumbnail.save(img_io, 'JPEG', quality=config.THUMBNAIL_QUALITY)
        img_io.seek(0)
    
    return send_file(
        img_io,
        mimetype='image/jpeg',
        as_attachment=False,
        etag=True,
        max_age=config.CACHE_MAX_AGE
    )

@app.route('/image/<path:image_path>')
@handle_errors
def serve_image(image_path):
    # 移除开头的斜杠（如果存在）
    if image_path.startswith('/'):
        image_path = image_path[1:]
    
    # 确保路径是绝对路径
    if not os.path.isabs(image_path):
        image_path = os.path.abspath(image_path)
    
    if not os.path.exists(image_path):
        app.logger.warning(f'原图不存在: {image_path}')
        return '图片不存在', 404
    
    return send_file(
        image_path,
        mimetype=FileUtils.get_mime_type(image_path),
        as_attachment=False,
        etag=True,
        max_age=config.CACHE_MAX_AGE
    )

@app.route('/save_annotation', methods=['POST'])
@handle_errors
def save_annotation():
    data = request.json
    txt_path = data.get('txt_path')
    content = data.get('content')
    
    if not txt_path or content is None:
        return jsonify({'error': '缺少必要参数'}), 400
    
    with open(txt_path, 'w', encoding=config.FILE_ENCODING, errors=config.FILE_ERRORS) as f:
        f.write(content)
    
    return jsonify({'success': True})

@app.route('/delete_image', methods=['POST'])
@handle_errors
def delete_image():
    data = request.json
    image_path = data.get('image_path')
    txt_path = data.get('txt_path')
    
    if not image_path or not txt_path:
        return jsonify({'error': '缺少必要参数'}), 400
    
    try:
        # 删除图片文件
        if os.path.exists(image_path):
            os.remove(image_path)
        
        # 删除标注文件
        if os.path.exists(txt_path):
            os.remove(txt_path)
        
        # 如果图片在星标列表中，也要移除
        with open('starred_images.json', 'r') as f:
            starred_images = json.load(f)
        
        starred_images = [img for img in starred_images if img['image_path'] != image_path]
        
        with open('starred_images.json', 'w') as f:
            json.dump(starred_images, f)
        
        return jsonify({'success': True})
    except Exception as e:
        app.logger.error(f'删除文件出错: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/toggle_star', methods=['POST'])
@handle_errors
def toggle_star():
    data = request.json
    image_data = data.get('image_data')
    
    if not image_data:
        return jsonify({'error': '缺少必要参数'}), 400
    
    try:
        with open('starred_images.json', 'r') as f:
            starred_images = json.load(f)
        
        # 检查图片是否已经在星标列表中
        existing_index = next((i for i, img in enumerate(starred_images) 
                             if img['image_path'] == image_data['image_path']), -1)
        
        if existing_index >= 0:
            # 如果已存在，则移除星标
            starred_images.pop(existing_index)
            is_starred = False
        else:
            # 如果不存在，则添加星标
            starred_images.insert(0, image_data)
            is_starred = True
        
        with open('starred_images.json', 'w') as f:
            json.dump(starred_images, f)
        
        return jsonify({'success': True, 'is_starred': is_starred})
    except Exception as e:
        app.logger.error(f'处理星标出错: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/get_starred_images')
@handle_errors
def get_starred_images():
    try:
        with open('starred_images.json', 'r') as f:
            starred_images = json.load(f)
        return jsonify(starred_images)
    except Exception as e:
        app.logger.error(f'获取星标图片出错: {str(e)}')
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    setup_logger()
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)