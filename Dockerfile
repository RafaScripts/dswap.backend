FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm

ENV PNPM_CONFIG_USERCONFIG=/app/.npmrc
ENV PNPM_CONFIG_ENABLE_SCRIPTS=true
ENV PNPM_CONFIG_ONLY_BUILT_DEPENDENCIES=@nestjs/core,@scarf/scarf,bufferutil,msgpackr-extract,utf-8-validate

ARG CACHEBUST=1

COPY package.json pnpm-lock.yaml .npmrc ./
RUN echo "cachebust=$CACHEBUST" && cat .npmrc && pnpm install

COPY . .
RUN pnpm run build && pnpm prune --prod

EXPOSE 3000
CMD ["node", "dist/main.js"]
