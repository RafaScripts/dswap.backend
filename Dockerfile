FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@10.15.0

ARG CACHEBUST=1

COPY package.json pnpm-lock.yaml ./
RUN echo "cachebust=$CACHEBUST" && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]
