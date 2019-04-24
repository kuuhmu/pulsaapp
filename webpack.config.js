const config = {
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        loader: "babel-loader"
      },
      {
        test: /\.(html|svg)$/,
        loader: "raw-loader"
      }
    ]
  }
}

const library = Object.assign({}, config, {
  entry: "./src/index.js",
  output: {
    path: __dirname + "/web",
    filename: "index.js",
    chunkFilename: "[name].js"
  }
})

const worker = Object.assign({}, config, {
  entry: "./src/worker.js",
  output: {
    path: __dirname + "/web",
    filename: "worker.js"
  }
})

module.exports = [library, worker]
