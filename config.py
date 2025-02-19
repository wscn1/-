import os
import platform

class BaseConfig:
    # 基础配置
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp'}
    THUMBNAIL_SIZE = 150
    THUMBNAIL_QUALITY = 85
    CACHE_MAX_AGE = 3600

    # 路径配置
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    LOGS_DIR = os.path.join(BASE_DIR, 'logs')
    LOG_FILE = os.path.join(LOGS_DIR, 'app.log')

    # 系统相关配置
    SYSTEM = platform.system().lower()
    IS_WINDOWS = SYSTEM == 'windows'
    IS_LINUX = SYSTEM == 'linux'
    IS_MAC = SYSTEM == 'darwin'

    # 文件编码配置
    FILE_ENCODING = 'utf-8'
    FILE_ERRORS = 'replace'

    # 服务器配置
    HOST = '0.0.0.0'  # 允许外部访问
    PORT = 5000
    DEBUG = False     # 生产环境默认关闭调试模式

class DevelopmentConfig(BaseConfig):
    DEBUG = True

class ProductionConfig(BaseConfig):
    CACHE_MAX_AGE = 7200  # 生产环境使用更长的缓存时间

# 根据环境变量选择配置
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config():
    env = os.getenv('FLASK_ENV', 'default')
    return config.get(env, config['default'])