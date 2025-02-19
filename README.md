# 图片标注管理系统

一个简单而强大的图片标注管理工具，支持批量标注、标注统计和筛选功能。适用于需要对大量图片进行标注和管理的场景。
![image](https://github.com/user-attachments/assets/88c51528-97c5-4ae3-91b1-c91cae73b0a0)


## 功能特点

- 图片文件夹扫描和预览
  - 支持递归扫描子文件夹
  - 自动创建对应的标注文件
  - 实时预览图片内容

- 图片缩略图显示
  - 自适应缩略图大小
  - 高质量图片压缩
  - 支持多种图片格式（JPG、PNG、GIF、BMP）

- 标注管理功能
  - 添加、编辑和删除标注
  - 支持逗号分隔的多标注
  - 实时保存标注内容

- 高级功能
  - 批量标注处理
  - 高频标注统计
  - 按标注内容筛选图片
  - 支持深色模式

## 技术栈

- 后端
  - Python Flask：轻量级Web框架
  - Pillow：图片处理库
  - Flask-CORS：跨域资源共享支持

- 前端
  - HTML5 + CSS3：现代化页面布局
  - JavaScript：交互功能实现
  - 响应式设计：支持多种设备

## 系统要求

- Python 3.6+
- 支持的操作系统：Windows、Linux、macOS
- 建议内存：4GB及以上
- 磁盘空间：项目本身占用空间小，主要取决于图片数量

## 安装和运行

1. 克隆仓库：
```bash
git clone https://github.com/wscn1/wscn123.git
cd wscn123
```

2. 创建并激活虚拟环境：
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/macOS
python3 -m venv venv
source venv/bin/activate
```

3. 安装依赖：
```bash
pip install flask pillow flask-cors --index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

4. 启动应用：
```bash
python app.py
```

启动后，打开浏览器访问 http://localhost:5000 即可使用。

## 使用说明

1. 选择图片文件夹：点击界面上的"选择文件夹"按钮，选择包含图片的目录。

2. 浏览图片：系统会自动扫描文件夹中的所有图片，并显示缩略图。

3. 添加标注：
   - 单击图片可以查看大图
   - 在右侧输入框中输入标注内容
   - 多个标注用逗号分隔
   - 标注会自动保存

4. 使用高级功能：
   - 批量标注：选择多张图片，统一添加标注
   - 标注统计：查看最常用的标注内容
   - 筛选功能：根据标注内容筛选图片
   - 深色模式：点击右上角的主题切换按钮

## 注意事项

- 支持的图片格式：jpg、jpeg、png、gif、bmp
- 标注内容保存在与图片同名的.txt文件中
- 建议定期备份标注文件
- 大量图片处理时，首次加载可能较慢

## 问题反馈

如果您在使用过程中遇到任何问题，或有功能建议，请通过以下方式反馈：

- 在GitHub上提交Issue
- 发送邮件至我的邮箱：ayuwangluo@vip.qq.com
