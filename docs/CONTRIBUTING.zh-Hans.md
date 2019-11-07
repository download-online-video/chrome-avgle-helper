# CONTRIBUTING

## 0x00. 项目结构

- **build**: Node.js 脚本, 用来从 **src** 目录中构建 Chrome 插件的源代码
- **docs**: 项目文档
- **extension**: 完整的 Chrome 插件的目录结构
	- **dist**: 从 **src** 目录构建出来的代码
	- **icons**: Chrome 插件需要用到的图标文件
- **src**: 这个 Chrome 插件的源代码
- **test**: 用来测试的代码


## 0x01. 如何构建这个 Chrome 插件

``` bash
# 安装 Node.js
# 请访问: https://nodejs.org/en/

# 安装项目依赖
yarn install

# 启动构建脚本
yarn run dev
```
