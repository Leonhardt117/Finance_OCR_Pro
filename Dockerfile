# 第一阶段：构建 (Build Stage)
FROM node:20-alpine as build

# 设置工作目录
WORKDIR /app

# 复制依赖定义文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制所有源代码
COPY . .

# 接收构建参数（API Key）
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# 执行构建 (这会生成 dist 文件夹)
RUN npm run build

# 第二阶段：生产环境 (Production Stage)
# 使用 Nginx 来服务静态文件
FROM nginx:alpine

# 复制构建好的文件到 Nginx 目录
COPY --from=build /app/dist /usr/share/nginx/html

# 复制自定义的 Nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run 默认使用 8080 端口，这里虽然是 80，但 Nginx配置会处理
EXPOSE 8080

# 启动 Nginx，并确保它监听 PORT 环境变量（或者我们直接在配置里写死 8080）
CMD ["nginx", "-g", "daemon off;"]
