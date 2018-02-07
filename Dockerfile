FROM node:carbon
WORKDIR home/leef/DragonCircle
COPY package*.json ./

RUN npm install
COPY . .
EXPOSE 8181
CMD [ "npm", "start" ]

