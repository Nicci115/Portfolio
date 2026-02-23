• 1. Dockerfile(s)

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/kohya_ss/Dockerfile:1
  - Code:

  # syntax=docker/dockerfile:1
  ARG UID=1000
  ARG VERSION=EDGE
  ARG RELEASE=0

  ########################################
  # Base stage
  ########################################
  FROM docker.io/library/python:3.11-slim-bookworm AS base

  # RUN mount cache for multi-arch: https://github.com/docker/buildx/issues/549#issuecomment-1788297892
  ARG TARGETARCH
  ARG TARGETVARIANT

  WORKDIR /tmp

  ENV NVIDIA_VISIBLE_DEVICES=all
  ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

  # Install CUDA partially
  # https://docs.nvidia.com/cuda/cuda-installation-guide-linux/#debian
  # Installing the complete CUDA Toolkit system-wide usually adds around 8GB to the image size.
  # Since most CUDA packages already installed through pip, there's no need to download the entire toolkit.
  # Therefore, we opt to install only the essential libraries.
  # Here is the package list for your reference: https://developer.download.nvidia.com/compute/cuda/repos/debian12/x86_64

  ADD https://developer.download.nvidia.com/compute/cuda/repos/debian12/x86_64/cuda-keyring_1.1-1_all.deb /tmp/cuda-keyring_x86_64.deb
  RUN --mount=type=cache,id=apt-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/cache/apt \
      --mount=type=cache,id=aptlists-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/lib/apt/lists \
      dpkg -i cuda-keyring_x86_64.deb && \
      rm -f cuda-keyring_x86_64.deb && \
      apt-get update && \
      apt-get install -y --no-install-recommends \
      # !If you experience any related issues, replace the following line with `cuda-12-8` to obtain the complete CUDA package.
      cuda-nvcc-12-8

  ENV PATH="/usr/local/cuda/bin${PATH:+:${PATH}}"
  ENV LD_LIBRARY_PATH=/usr/local/cuda/lib64
  ENV CUDA_VERSION=12.8
  ENV NVIDIA_REQUIRE_CUDA=cuda>=12.8
  ENV CUDA_HOME=/usr/local/cuda

  ########################################
  # Build stage
  ########################################
  FROM base AS build

  # RUN mount cache for multi-arch: https://github.com/docker/buildx/issues/549#issuecomment-1788297892
  ARG TARGETARCH
  ARG TARGETVARIANT

  WORKDIR /app

  # Install uv
  COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

  ENV UV_PROJECT_ENVIRONMENT=/venv
  ENV VIRTUAL_ENV=/venv
  ENV UV_LINK_MODE=copy
  ENV UV_PYTHON_DOWNLOADS=0
  ENV UV_INDEX=https://download.pytorch.org/whl/cu128

  # Install build dependencies
  RUN --mount=type=cache,id=apt-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/cache/apt \
      --mount=type=cache,id=aptlists-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/lib/apt/lists \
      apt-get update && apt-get upgrade -y && \
      apt-get install -y --no-install-recommends python3-launchpadlib git curl

  # Install big dependencies separately for layer caching
  # !Please note that the version restrictions should be the same as pyproject.toml
  # No packages listed should be removed in the next `uv sync` command
  # If this happens, please update the version restrictions or update the uv.lock file
  RUN --mount=type=cache,id=uv-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/root/.cache/uv \
      uv venv --system-site-packages /venv && \
      uv pip install --no-deps \
      # torch (1.0GiB)
      torch==2.7.0+cu128 \
      # triton (149.3MiB)
      triton>=3.1.0 \
      # tensorflow (615.0MiB)
      tensorflow>=2.16.1 \
      # onnxruntime-gpu (215.7MiB)
      onnxruntime-gpu==1.19.2

  # Install dependencies
  RUN --mount=type=cache,id=uv-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/root/.cache/uv \
      --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
      --mount=type=bind,source=uv.lock,target=uv.lock \
      --mount=type=bind,source=sd-scripts,target=sd-scripts,rw \
      uv sync --frozen --no-dev --no-install-project --no-editable

  # Replace pillow with pillow-simd (Only for x86)
  ARG TARGETPLATFORM
  RUN --mount=type=cache,id=apt-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/cache/apt \
      --mount=type=cache,id=aptlists-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/lib/apt/lists \
      if [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
      apt-get update && apt-get install -y --no-install-recommends zlib1g-dev libjpeg62-turbo-dev build-essential && \
      uv pip uninstall pillow && \
      CC="cc -mavx2" uv pip install pillow-simd; \
      fi

  ########################################
  # Final stage
  ########################################
  FROM base AS final

  ARG TARGETARCH
  ARG TARGETVARIANT

  WORKDIR /tmp

  # Install runtime dependencies
  RUN --mount=type=cache,id=apt-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/cache/apt \
      --mount=type=cache,id=aptlists-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/lib/apt/lists \
      apt-get update && apt-get upgrade -y && \
      apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libjpeg62 libtcl8.6 libtk8.6 libgoogle-perftools-dev dumb-init

  # Fix missing libnvinfer7
  RUN ln -s /usr/lib/x86_64-linux-gnu/libnvinfer.so /usr/lib/x86_64-linux-gnu/libnvinfer.so.7 && \
      ln -s /usr/lib/x86_64-linux-gnu/libnvinfer_plugin.so /usr/lib/x86_64-linux-gnu/libnvinfer_plugin.so.7

  # Create user
  ARG UID
  RUN groupadd -g $UID $UID && \
      useradd -l -u $UID -g $UID -m -s /bin/sh -N $UID

  # Create directories with correct permissions
  RUN install -d -m 775 -o $UID -g 0 /dataset && \
      install -d -m 775 -o $UID -g 0 /licenses && \
      install -d -m 775 -o $UID -g 0 /app && \
      install -d -m 775 -o $UID -g 0 /venv

  # Copy licenses (OpenShift Policy)
  COPY --link --chmod=775 LICENSE.md /licenses/LICENSE.md

  # Copy dependencies and code (and support arbitrary uid for OpenShift best practice)
  COPY --link --chown=$UID:0 --chmod=775 --from=build /venv /venv
  COPY --link --chown=$UID:0 --chmod=775 . /app

  ENV PATH="/venv/bin${PATH:+:${PATH}}"
  ENV PYTHONPATH="/venv/lib/python3.11/site-packages"

  ENV LD_LIBRARY_PATH="/venv/lib/python3.11/site-packages/nvidia/cudnn/lib${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}"
  ENV LD_PRELOAD=libtcmalloc.so
  ENV PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python

  # Rich logging
  # https://rich.readthedocs.io/en/stable/console.html#interactive-mode
  ENV FORCE_COLOR="true"
  ENV COLUMNS="100"

  WORKDIR /app

  VOLUME [ "/dataset" ]

  # 7860: Kohya GUI
  EXPOSE 7860

  USER $UID

  STOPSIGNAL SIGINT

  # Use dumb-init as PID 1 to handle signals properly
  ENTRYPOINT ["dumb-init", "--"]
  CMD ["python3", "kohya_gui.py", "--listen", "0.0.0.0", "--server_port", "7860", "--headless", "--noverify"]

  ARG VERSION
  ARG RELEASE
  LABEL name="bmaltais/kohya_ss" \
      vendor="bmaltais" \
      maintainer="bmaltais" \
      # Dockerfile source repository
      url="https://github.com/bmaltais/kohya_ss" \
      version=${VERSION} \
      # This should be a number, incremented with each change
      release=${RELEASE} \
      io.k8s.display-name="kohya_ss" \
      summary="Kohya's GUI: This repository provides a Gradio GUI for Kohya's Stable Diffusion trainers(https://github.com/kohya-ss/sd-scripts)." \
      description="The GUI allows you to set the training parameters and generate and run the required CLI commands to train the model. This is the docker
  image for Kohya's GUI. For more information about this tool, please visit the following website: https://github.com/bmaltais/kohya_ss."

  - Verification note: This is a full model workload Dockerfile with GPU/runtime environment and pinned core ML package installs.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/rife/docker/Dockerfile:1
  - Code:

  FROM python:3.8-slim

  # install deps
  RUN apt-get update && apt-get -y install \
      bash ffmpeg

  # setup RIFE
  WORKDIR /rife
  COPY . .
  RUN pip3 install -r requirements.txt

  ADD docker/inference_img /usr/local/bin/inference_img
  RUN chmod +x /usr/local/bin/inference_img
  ADD docker/inference_video /usr/local/bin/inference_video
  RUN chmod +x /usr/local/bin/inference_video

  # add pre-trained models
  COPY train_log /rife/train_log

  WORKDIR /host
  ENTRYPOINT ["/bin/bash"]

  ENV NVIDIA_DRIVER_CAPABILITIES all

  - Verification note: This is the full Dockerfile used for the RIFE model workload.

  2. Compose configuration

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/kohya_ss/docker-compose.yaml:1
  - Code:

  services:
    kohya-ss-gui:
      container_name: kohya-ss-gui
      image: ghcr.io/bmaltais/kohya-ss-gui:latest
      user: 1000:0
      build:
        context: .
        args:
          - UID=1000
        cache_from:
          - ghcr.io/bmaltais/kohya-ss-gui:cache
        cache_to:
          - type=inline
      ports:
        - 7860:7860
      environment:
        SAFETENSORS_FAST_GPU: 1
        TENSORBOARD_PORT: ${TENSORBOARD_PORT:-6006}
      tmpfs:
        - /tmp
      volumes:
        - /tmp/.X11-unix:/tmp/.X11-unix
        - ./models:/app/models
        - ./dataset:/dataset
        - ./dataset/images:/app/data
        - ./dataset/logs:/app/logs
        - ./dataset/outputs:/app/outputs
        - ./dataset/regularization:/app/regularization
        - ./models:/app/models
        - ./.cache/config:/app/config
        - ./.cache/user:/home/1000/.cache
        - ./.cache/triton:/home/1000/.triton
        - ./.cache/nv:/home/1000/.nv
        - ./.cache/keras:/home/1000/.keras
        - ./.cache/config:/home/1000/.config # For backward compatibility
      deploy:
        resources:
          reservations:
            devices:
              - driver: nvidia
                capabilities: [gpu]
                device_ids: ["all"]

    tensorboard:
      container_name: tensorboard
      image: tensorflow/tensorflow:latest-gpu
      ports:
        # !Please change the port in .env file
        - ${TENSORBOARD_PORT:-6006}:6006
      volumes:
        - ./dataset/logs:/app/logs
      command: tensorboard --logdir=/app/logs --bind_all
      deploy:
        resources:
          reservations:
            devices:
              - driver: nvidia
                capabilities: [gpu]
                device_ids: ["all"]

  - Verification note: This compose file includes services, volumes, environment variables, and GPU device reservation config.

  3. Dependency pinning strategy

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: requirements.lock:1
  - Code:



  - Verification note: The lockfile exists but is empty.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/kohya_ss/requirements_linux_rocm.txt:1
  - Code:

  # Custom index URL for specific packages
  --extra-index-url https://download.pytorch.org/whl/rocm6.3
  --find-links https://repo.radeon.com/rocm/manylinux/rocm-rel-6.4.1

  torch==2.7.1+rocm6.3
  torchvision==0.22.1+rocm6.3

  tensorboard==2.14.1; python_version=='3.11'
  tensorboard==2.16.2; python_version!='3.11'
  tensorflow-rocm==2.14.0.600; python_version=='3.11'
  tensorflow-rocm==2.16.2; python_version!='3.11'

  # no support for python 3.11
  onnxruntime-rocm==1.21.0

  -r requirements.txt

  - Verification note: This file pins ROCm package versions and extends pinned dependency resolution.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/hummingbird_xt/requirements.txt:1
  - Code:

  absl-py==2.3.1
  accelerate==1.9.0
  aiofiles==24.1.0
  aiohappyeyeballs==2.6.1
  aiohttp==3.12.15
  aiosignal==1.4.0
  aiter @ git+https://github.com/ROCm/aiter.git@97007320d4b1d7b882d99af02cad02fbb9957559
  alabaster==1.0.0
  albucore==0.0.24
  albumentations==2.0.8
  amdsmi @ file:///opt/rocm-7.0.0/share/amd_smi
  aniso8601==10.0.1
  annotated-doc==0.0.4
  annotated-types==0.7.0
  antlr4-python3-runtime==4.9.3
  anyio==4.11.0
  apex @ file:///workspace/build/apex-1.9.0a0%2Brocm7.0.0.git4b035815-cp310-cp310-
  linux_x86_64.whl#sha256=34c6e78776bd649e49902fa9fb5c20a044ea134aa608cd594b5042830369ed64
  asciitree==0.3.3
  async-timeout==5.0.1
  attrs==25.3.0
  audioread==3.1.0
  av==13.1.0
  babel==2.17.0
  beautifulsoup4==4.14.2
  bidict==0.23.1
  blinker==1.9.0
  blobfile==3.1.0
  bokeh==3.8.0
  boto3==1.35.42
  botocore==1.35.99
  Brotli==1.1.0
  build==1.3.0
  causal_conv1d @ file:///workspace/causal-conv1d
  certifi==2025.8.3
  cffi==2.0.0
  cfgv==3.4.0
  charset-normalizer==3.4.3
  clang-format==18.1.6
  click==8.3.0
  clip @ git+https://github.com/openai/CLIP.git@dcba3cb2e2827b402d2701e7e1c7d9fed8a20ef1
  cloudpickle==3.1.1
  cmake==3.31.6
  coloredlogs==15.0.1
  commonmark==0.9.1
  contourpy==1.3.2
  coverage==7.10.7
  cryptography==46.0.3
  cssselect2==0.8.0
  cxxfilt==0.3.0
  cycler==0.12.1
  dashscope==1.25.1
  dask==2025.9.1
  datasets==4.1.1
  decorator==5.2.1
  decord==0.6.0
  diffusers==0.35.0
  dill==0.4.0
  distlib==0.4.0
  distributed==2025.9.1
  docstring_parser==0.17.0
  docutils==0.21.2
  dominate==2.9.1
  easydict==1.13
  einops==0.8.1
  exceptiongroup==1.3.0
  fastapi==0.121.2
  fasteners==0.20
  ffmpy==1.0.0
  filelock==3.19.1
  flash_attn==2.8.3
  Flask==3.1.2
  Flask-RESTful==0.3.10
  Flask-SocketIO==5.5.1
  flatbuffers==25.9.23
  flatten-dict==0.4.2
  fonttools==4.60.0
  frozenlist==1.7.0
  fsspec==2025.9.0
  ftfy==6.3.1
  func_timeout==4.3.5
  gitdb==4.0.12
  GitPython==3.1.45
  gradio==5.49.1
  gradio_client==1.13.3
  groovy==0.1.2
  grouped_gemm @ file:///workspace/grouped_gemm
  grpcio==1.75.1
  h11==0.16.0
  hf-xet==1.1.10
  hf_transfer==0.1.9
  hip-python==6.4.1.552.39
  hipify_torch @ git+https://github.com/ROCm/hipify_torch.git@12ac3f401261ffa331a4000626a333727f06a0d8
  httpcore==1.0.9
  httpx==0.28.1
  huggingface-hub==0.35.1
  humanfriendly==10.0
  hydra-core==1.3.2
  identify==2.6.14
  idna==3.10
  ImageIO==2.37.2
  imageio-ffmpeg==0.6.0
  imagesize==1.4.1
  importlib_metadata==8.7.0
  iniconfig==2.1.0
  inquirerpy==0.3.4
  itsdangerous==2.2.0
  Jinja2==3.1.6
  jmespath==1.0.1
  joblib==1.5.2
  kagglehub==0.3.13
  kiwisolver==1.4.9
  lazy_loader==0.4
  librosa==0.11.0
  lit==18.1.8
  llvmlite==0.45.1
  lmdb==1.7.5
  locket==1.0.0
  loguru==0.7.3
  lxml==6.0.2
  lz4==4.4.4
  Markdown==3.9
  markdown-it-py==4.0.0
  markdown2==2.5.4
  MarkupSafe==3.0.2
  matplotlib==3.10.6
  mdurl==0.1.2
  ml_dtypes==0.5.4
  mpmath==1.3.0
  msgpack==1.1.1
  multidict==6.6.4
  multiprocess==0.70.16
  narwhals==2.5.0
  networkx==3.4.2
  ninja==1.11.1.3
  nltk==3.9.1
  nodeenv==1.9.1
  numba==0.62.1
  numcodecs==0.13.1
  numpy==2.2.6
  nvidia-ml-py==13.580.82
  nvidia-modelopt==0.27.1
  nvidia-modelopt-core==0.27.1
  omegaconf==2.3.0
  onnx==1.19.1
  onnx-ir==0.1.12
  onnxconverter-common==1.16.0
  onnxruntime==1.23.2
  onnxscript==0.5.6
  open_clip_torch==3.2.0
  opencv-python==4.12.0.88
  opencv-python-headless==4.12.0.88
  optree==0.17.0
  orjson==3.11.3
  packaging==25.0
  pandas==2.3.2
  partd==1.4.2
  peft==0.17.1
  pfzy==0.3.4
  pillow==11.3.0
  platformdirs==4.4.0
  pluggy==1.6.0
  pooch==1.8.2
  pre_commit==4.3.0
  primus_turbo @ file:///workspace/Primus-Turbo
  prompt_toolkit==3.0.52
  propcache==0.3.2
  protobuf==6.32.1
  psutil==7.1.0
  PuLP==3.3.0
  pyarrow==21.0.0
  pybind11==2.13.6
  pycocotools==2.0.10
  pycparser==2.23
  pycryptodomex==3.23.0
  pydantic==2.10.6
  pydantic_core==2.27.2
  pydub==0.25.1
  pydyf==0.11.0
  Pygments==2.19.2
  pynvml==13.0.1
  pyparsing==3.2.5
  pyphen==0.17.2
  pyproject_hooks==1.2.0
  pytest==8.4.2
  pytest-cov==7.0.0
  pytest-csv==3.0.0
  pytest-mock==3.15.1
  pytest-random-order==1.2.0
  python-dateutil==2.9.0.post0
  python-dotenv==1.0.1
  python-engineio==4.12.3
  python-multipart==0.0.20
  python-socketio==5.14.3
  pytorch-triton-rocm @ file:///pytorch_triton_rocm-3.2.0%2Brocm7.0.0.git20943800-cp310-cp310-
  linux_x86_64.whl#sha256=3787f05ffae02e45db890513b1a4c7402b2389c43e6f8dd63275de0ec8a20c00
  pytz==2025.2
  PyYAML==6.0.3
  recommonmark==0.7.1
  regex==2025.9.18
  requests==2.32.5
  rich==14.1.0
  ruff==0.14.5
  s3transfer==0.10.4
  safehttpx==0.1.7
  safetensors==0.6.2
  scikit-image==0.25.2
  scikit-learn==1.7.2
  scipy==1.15.3
  semantic-version==2.10.0
  sentence-transformers==5.2.0
  sentencepiece==0.2.1
  sentry-sdk==2.39.0
  shellingham==1.5.4
  shtab==1.7.2
  simple-websocket==1.1.0
  simplejson==3.20.2
  simsimd==6.5.3
  six==1.17.0
  smmap==5.0.2
  sniffio==1.3.1
  snowballstemmer==3.0.1
  sortedcontainers==2.4.0
  soundfile==0.13.1
  soupsieve==2.8
  soxr==1.0.0
  Sphinx==8.1.3
  sphinx-rtd-theme==3.0.2
  sphinxcontrib-applehelp==2.0.0
  sphinxcontrib-devhelp==2.0.0
  sphinxcontrib-htmlhelp==2.1.0
  sphinxcontrib-jquery==4.1
  sphinxcontrib-jsmath==1.0.1
  sphinxcontrib-qthelp==2.0.0
  sphinxcontrib-serializinghtml==2.0.0
  starlette==0.49.3
  stringzilla==4.2.3
  sympy==1.14.0
  tabulate==0.9.0
  tblib==3.1.0
  tensorboard==2.20.0
  tensorboard-data-server==0.7.2
  tensorstore==0.1.45
  threadpoolctl==3.6.0
  tifffile==2025.5.10
  tiktoken==0.11.0
  timm==1.0.22
  tinycss2==1.4.0
  tinyhtml5==2.0.0
  tokenizers==0.21.4
  tomesd==0.1.3
  tomli==2.2.1
  tomlkit==0.13.3
  toolz==1.0.0
  torch @ file:///workspace/build/torch-2.9.0.dev20250821%2Brocm7.0.0.lw.git125803b7-cp310-cp310-
  linux_x86_64.whl#sha256=acab3b73cbed252fa9a561efef45ae39d95bd96d435b2eed6b9c6469b31cd85a
  torchao @ file:///workspace/ao
  torchaudio @ file:///workspace/build/torchaudio-2.8.0%2Brocm7.0.0.git0c223473-cp310-cp310-
  linux_x86_64.whl#sha256=96a78ebcc8062af30ccdb00aa4b3d1bbf087a77958e3c22a3efaeeace5049492
  torchdata==0.11.0
  torchdiffeq==0.2.5
  torchprofile==0.0.4
  torchsde==0.2.6
  -e git+https://github.com/AMD-AIG-AIMA/torchtitan.git@04227ff1d8e6f78a2db3a91ef4f55d4686733a2e#egg=torchtitan
  -e git+https://github.com/pytorch/torchtune.git@b4c98ac2a37f0397d64c22579aed415ce7264db6#egg=torchtune
  torchvision @ file:///workspace/build/torchvision-0.24.0%2Brocm7.0.0.git98f8b375-cp310-cp310-
  linux_x86_64.whl#sha256=4632280c7fc10b253dae78e9a88af74378fedc044c86ff883f559bb69d15a1c6
  tornado==6.5.2
  tqdm==4.67.1
  trampoline==0.1.2
  transformer_engine @ file:///workspace/TransformerEngine
  transformers==4.55.0
  triton @ file:///workspace/triton
  trl==0.21.0
  typeguard==4.4.4
  typer==0.20.0
  typing-inspection==0.4.1
  typing_extensions==4.15.0
  tyro==0.9.32
  tzdata==2025.2
  ujson==5.11.0
  urllib3==2.5.0
  uvicorn==0.38.0
  virtualenv==20.34.0
  wandb==0.22.0
  wcwidth==0.2.14
  weasyprint==66.0
  webencodings==0.5.1
  websocket-client==1.9.0
  websockets==15.0.1
  Werkzeug==3.1.3
  wrapt==1.17.3
  wsproto==1.3.1
  xarray==2025.3.0
  xxhash==3.5.0
  xyzservices==2025.4.0
  yappi==1.6.10
  yarl==1.20.1
  zarr==2.18.3
  zict==3.0.0
  zipp==3.23.0
  zopfli==0.2.3.post1

  - Verification note: This file is fully pinned with fixed versions and explicit ROCm-linked wheel references.

  4. Model orchestration script

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: scripts/run_demo.sh:1
  - Code:

  #!/usr/bin/env bash
  set -euo pipefail
  export FVP_RUN_ID="run_20260122_170000_ab12"
  cd /home/dom/fashion_video_pipeline
  micromamba run -n fashion_video_env fashion doctor
  micromamba run -n fashion_video_env fashion prepare-assets
  micromamba run -n fashion_video_env fashion apply-garment --human assets/humans/prepared/human_prepared_human_run_20260122_170000_ab12.png --garment
  assets/garments/prepared/garment_front_hoodie_front.png --mode dci_vton
  micromamba run -n fashion_video_env fashion render-scene --scene studio_turntable --duration-seconds 60 --fps 24 --resolution 1920x1080 --garment-front
  assets/garments/prepared/garment_front_hoodie_front.png --garment-back assets/garments/prepared/garment_back_hoodie_back.png
  micromamba run -n fashion_video_env fashion enhance-video --input blender/renders/run_20260122_170000_ab12/
  render_studio_turntable_run_20260122_170000_ab12.mp4 --profile strict
  micromamba run -n fashion_video_env fashion export --input realism/outputs/run_20260122_170000_ab12/enhanced_strict_run_20260122_170000_ab12.mp4 --preset
  social_9x16
  echo "DEMO COMPLETE"

  - Verification note: This script coordinates the end-to-end model execution pipeline through CLI steps.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: cli/core/ai_ops.py:1
  - Code:

  """AI ops."""

  from pathlib import Path
  import json
  import shutil
  import subprocess
  from PIL import Image
  import numpy as np
  from cli.core.image_ops import save_mask_png
  from cli.core.paths import root


  def run_dci_vton(human_png: Path, garment_png: Path, garment_mask: Path, out_dir: Path, profile: str) -> Path:
      # DCI-VTON expects a VITON-like dataroot; we create a minimal structure to avoid extra dependencies.
      dataroot = root() / "tryon" / "engine" / "dci_vton_data"
      test_dir = dataroot / "test"
      for p in [
          test_dir / "image",
          test_dir / "cloth",
          test_dir / "cloth-mask",
          test_dir / "cloth-warp",
          test_dir / "cloth-warp-mask",
          test_dir / "unpaired-cloth-warp",
          test_dir / "unpaired-cloth-warp-mask",
          test_dir / "image-parse-v3",
          test_dir / "image-parse-agnostic-v3.2",
          test_dir / "openpose_json",
      ]:
          p.mkdir(parents=True, exist_ok=True)

      name = "000001_00"
      img_jpg = test_dir / "image" / f"{name}.jpg"
      cloth_jpg = test_dir / "cloth" / f"{name}.jpg"
      cloth_mask_jpg = test_dir / "cloth-mask" / f"{name}.jpg"

      Image.open(human_png).convert("RGB").save(img_jpg)
      Image.open(garment_png).convert("RGB").save(cloth_jpg)
      Image.open(garment_mask).convert("L").save(cloth_mask_jpg)

      # Provide warp and unpaired warp as the same cloth for minimal runnable pipeline.
      for d in ["cloth-warp", "cloth-warp-mask", "unpaired-cloth-warp", "unpaired-cloth-warp-mask"]:
          shutil.copy2(cloth_jpg, test_dir / d / f"{name}.jpg")
          shutil.copy2(cloth_mask_jpg, test_dir / d / f"{name}.jpg")

      # Create minimal parse maps: label 3 for garment, 0 elsewhere.
      parse = np.zeros((512, 512), dtype=np.uint8)
      gmask = np.array(Image.open(garment_mask).resize((512, 512))) > 0
      parse[gmask] = 3
      Image.fromarray(parse).save(test_dir / "image-parse-v3" / f"{name}.png")
      Image.fromarray(parse).save(test_dir / "image-parse-agnostic-v3.2" / f"{name}.png")

      # Create dummy openpose JSON with zeros (keeps pipeline runnable without OpenPose).
      pose = {"people": [{"pose_keypoints_2d": [0.0] * 54}]}
      with (test_dir / "openpose_json" / f"{name}_keypoints.json").open("w") as f:
          json.dump(pose, f)

      (dataroot / "test_pairs.txt").write_text(f"{name}.jpg {name}.jpg\n")

      steps = 50 if profile in ["strict", "balanced"] else 30
      scale = 1.0 if profile in ["strict", "balanced"] else 0.8

      cmd = [
          "python", "/home/dom/fashion_video_pipeline/third_party/dci_vton/test.py",
          "--plms", "--gpu_id", "0",
          "--ddim_steps", str(steps),
          "--outdir", str(out_dir),
          "--config", "/home/dom/fashion_video_pipeline/third_party/dci_vton/configs/viton512.yaml",
          "--ckpt", "/home/dom/fashion_video_pipeline/tryon/engine/weights/viton512.ckpt",
          "--dataroot", str(dataroot),
          "--n_samples", "1",
          "--seed", "555",
          "--scale", str(scale),
          "--H", "512",
          "--W", "512",
      ]
      subprocess.run(cmd, check=True)

      result = out_dir / "result" / f"{name}.png"
      return result


  def run_hummingbird_xt(input_video: str, output_video: str, steps: int, strength: float) -> None:
      # Hummingbird-XT scripts are heavy; we attempt and fall back if they fail.
      cmd = [
          "python", "/home/dom/fashion_video_pipeline/third_party/hummingbird_xt/infer/examples/wan2.2/predict_ti2v_single.py",
          "--input_video", input_video,
          "--output_video", output_video,
          "--steps", str(steps),
          "--strength", str(strength),
      ]
      subprocess.run(cmd, check=True)


  def run_ffmpeg_fallback(input_video: str, output_video: str) -> None:
      # Fallback is deterministic and preserves geometry while improving contrast.
      subprocess.run([
          "ffmpeg", "-y", "-i", input_video,
          "-vf", "eq=contrast=1.1:saturation=1.05:brightness=0.02,unsharp=3:3:0.5:3:3:0.0",
          "-c:v", "libx264", "-crf", "18", "-preset", "slow",
          output_video,
      ], check=True)

  - Verification note: This module contains model execution command construction and subprocess invocation logic.

  5. Environment reproducibility documentation

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: scripts/run_demo.sh:1
  - Code:

  #!/usr/bin/env bash
  set -euo pipefail
  export FVP_RUN_ID="run_20260122_170000_ab12"
  cd /home/dom/fashion_video_pipeline
  micromamba run -n fashion_video_env fashion doctor
  micromamba run -n fashion_video_env fashion prepare-assets
  micromamba run -n fashion_video_env fashion apply-garment --human assets/humans/prepared/human_prepared_human_run_20260122_170000_ab12.png --garment
  assets/garments/prepared/garment_front_hoodie_front.png --mode dci_vton
  micromamba run -n fashion_video_env fashion render-scene --scene studio_turntable --duration-seconds 60 --fps 24 --resolution 1920x1080 --garment-front
  assets/garments/prepared/garment_front_hoodie_front.png --garment-back assets/garments/prepared/garment_back_hoodie_back.png
  micromamba run -n fashion_video_env fashion enhance-video --input blender/renders/run_20260122_170000_ab12/
  render_studio_turntable_run_20260122_170000_ab12.mp4 --profile strict
  micromamba run -n fashion_video_env fashion export --input realism/outputs/run_20260122_170000_ab12/enhanced_strict_run_20260122_170000_ab12.mp4 --preset
  social_9x16
  echo "DEMO COMPLETE"

  - Verification note: This bootstrap script encodes a deterministic run-id and fixed command sequence for local recreation.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: README.md:1
  - Code:



  - Verification note: Top-level reproducibility documentation file exists but is empty.

  6. ROCm configuration handling

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: cli/commands/doctor.py:1
  - Code:

  """Doctor command.

  Checks WSL, ROCm, Blender, and ffmpeg availability.
  """

  import sys
  from pathlib import Path
  import subprocess
  import torch
  from cli.core import wsl


  def run() -> None:
      if not wsl.has_dxg():
          print("FAIL: /dev/dxg")
          sys.exit(1)

      if not torch.__version__.startswith("2.6.0+rocm6.4.2"):
          print("FAIL: ROCm userland")
          sys.exit(1)

      blender = Path("/home/dom/fashion_video_pipeline/blender/project_template/tools/blender-3.6.23-linux-x64/blender")
      if not blender.exists():
          print("FAIL: Blender")
          sys.exit(1)

      try:
          subprocess.check_output(["ffmpeg", "-version"])
      except Exception:
          print("FAIL: ffmpeg")
          sys.exit(1)

      print("PASS: WSL2")
      print("PASS: /dev/dxg")
      print("PASS: ROCm userland")
      print("PASS: Blender")
      print("PASS: ffmpeg")
      print("Ready to run: yes")

  - Verification note: This performs host checks and explicit ROCm userland version gating.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/kohya_ss/requirements_linux_rocm.txt:1
  - Code:

  # Custom index URL for specific packages
  --extra-index-url https://download.pytorch.org/whl/rocm6.3
  --find-links https://repo.radeon.com/rocm/manylinux/rocm-rel-6.4.1

  torch==2.7.1+rocm6.3
  torchvision==0.22.1+rocm6.3

  tensorboard==2.14.1; python_version=='3.11'
  tensorboard==2.16.2; python_version!='3.11'
  tensorflow-rocm==2.14.0.600; python_version=='3.11'
  tensorflow-rocm==2.16.2; python_version!='3.11'

  # no support for python 3.11
  onnxruntime-rocm==1.21.0

  -r requirements.txt

  - Verification note: This file pins ROCm-specific frameworks and wheel sources.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/hummingbird_xt/README.md:353
  - Code:

  ### Option 2: Docker
  You can download our pre-built Docker image for better reproducibility:
  ```bash
  docker pull panisobe/dmd_flash_image_2:latest

  You can use docker run to run the image. For example:

  docker run -it \
    --shm-size=900g \
    --name hm \
    --network host \
    --ipc=host \
    --cap-add=SYS_PTRACE \
    --security-opt seccomp=unconfined \
    --device=/dev/kfd \
    --device=/dev/dri \
    --group-add video \
    -e HSA_OVERRIDE_GFX_VERSION=11.0.0 \
    -v /home:/home \
    panisobe/dmd_flash_image_2_release:latest

  - Verification note: This includes ROCm device passthrough and ROCm env var handling in a concrete container launch command.

  7) CLI orchestration layer
  - Commit: NOT FOUND (`git rev-parse HEAD` returned no commit on branch)
  - File: `pyproject.toml:1`
  - Code:
  ```toml
  [project]
  name = "fashion_video_pipeline"
  version = "0.1.0"
  requires-python = ">=3.10"

  [project.scripts]
  fashion = "cli.main:app"

  [tool.setuptools]
  packages = ["cli", "cli.commands", "cli.core"]

  - Verification note: This defines the CLI entrypoint routing to cli.main:app.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: cli/main.py:1
  - Code:

  """CLI entrypoint."""

  import typer

  from cli.commands import (
      doctor,
      prepare_assets,
      train_identity,
      generate_still,
      apply_tryon,
      render_blender,
      enhance_video,
      assemble_long_video,
      export,
  )

  app = typer.Typer(add_completion=False)


  @app.callback()
  def main() -> None:
      """Fashion video pipeline CLI."""
      return None


  app.command("doctor")(doctor.run)
  app.command("prepare-assets")(prepare_assets.run)
  app.command("train-identity")(train_identity.run)
  app.command("generate-still")(generate_still.run)
  app.command("apply-garment")(apply_tryon.run)
  app.command("render-scene")(render_blender.run)
  app.command("enhance-video")(enhance_video.run)
  app.command("assemble-long-video")(assemble_long_video.run)
  app.command("export")(export.run)


  if __name__ == "__main__":
      app()

  - Verification note: This is the task-routing layer mapping command names to runnable handlers.

  8. Local LLM integration example

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: NOT FOUND
  - Code:

  NOT FOUND
  Search command used:
  grep -RInF --exclude-dir=.git --exclude-dir=.cache --exclude-dir=.micromamba --exclude-dir=__pycache__ "ollama" cli scripts third_party pyproject.toml
  README.md 2>/dev/null || true
  grep -RInF --exclude-dir=.git --exclude-dir=.cache --exclude-dir=.micromamba --exclude-dir=__pycache__ "llama.cpp" cli scripts third_party pyproject.toml
  README.md 2>/dev/null || true
  grep -RInF --exclude-dir=.git --exclude-dir=.cache --exclude-dir=.micromamba --exclude-dir=__pycache__ "vllm" cli scripts third_party pyproject.toml
  README.md 2>/dev/null || true
  grep -RInF --exclude-dir=.git --exclude-dir=.cache --exclude-dir=.micromamba --exclude-dir=__pycache__ "text-generation-inference" cli scripts third_party
  pyproject.toml README.md 2>/dev/null || true

  - Verification note: No local-LLM invocation path was found in searched first-party and third-party repo code/docs.

  9. Model environment isolation

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/kohya_ss/docker-compose.yaml:1
  - Code:

  services:
    kohya-ss-gui:
      container_name: kohya-ss-gui
      image: ghcr.io/bmaltais/kohya-ss-gui:latest
      user: 1000:0
      build:
        context: .
        args:
          - UID=1000
        cache_from:
          - ghcr.io/bmaltais/kohya-ss-gui:cache
        cache_to:
          - type=inline
      ports:
        - 7860:7860
      environment:
        SAFETENSORS_FAST_GPU: 1
        TENSORBOARD_PORT: ${TENSORBOARD_PORT:-6006}
      tmpfs:
        - /tmp
      volumes:
        - /tmp/.X11-unix:/tmp/.X11-unix
        - ./models:/app/models
        - ./dataset:/dataset
        - ./dataset/images:/app/data
        - ./dataset/logs:/app/logs
        - ./dataset/outputs:/app/outputs
        - ./dataset/regularization:/app/regularization
        - ./models:/app/models
        - ./.cache/config:/app/config
        - ./.cache/user:/home/1000/.cache
        - ./.cache/triton:/home/1000/.triton
        - ./.cache/nv:/home/1000/.nv
        - ./.cache/keras:/home/1000/.keras
        - ./.cache/config:/home/1000/.config # For backward compatibility
      deploy:
        resources:
          reservations:
            devices:
              - driver: nvidia
                capabilities: [gpu]
                device_ids: ["all"]

    tensorboard:
      container_name: tensorboard
      image: tensorflow/tensorflow:latest-gpu
      ports:
        # !Please change the port in .env file
        - ${TENSORBOARD_PORT:-6006}:6006
      volumes:
        - ./dataset/logs:/app/logs
      command: tensorboard --logdir=/app/logs --bind_all
      deploy:
        resources:
          reservations:
            devices:
              - driver: nvidia
                capabilities: [gpu]
                device_ids: ["all"]

  - Verification note: This shows isolated container boundaries for GUI and TensorBoard workloads.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: scripts/run_demo.sh:1
  - Code:

  #!/usr/bin/env bash
  set -euo pipefail
  export FVP_RUN_ID="run_20260122_170000_ab12"
  cd /home/dom/fashion_video_pipeline
  micromamba run -n fashion_video_env fashion doctor
  micromamba run -n fashion_video_env fashion prepare-assets
  micromamba run -n fashion_video_env fashion apply-garment --human assets/humans/prepared/human_prepared_human_run_20260122_170000_ab12.png --garment
  assets/garments/prepared/garment_front_hoodie_front.png --mode dci_vton
  micromamba run -n fashion_video_env fashion render-scene --scene studio_turntable --duration-seconds 60 --fps 24 --resolution 1920x1080 --garment-front
  assets/garments/prepared/garment_front_hoodie_front.png --garment-back assets/garments/prepared/garment_back_hoodie_back.png
  micromamba run -n fashion_video_env fashion enhance-video --input blender/renders/run_20260122_170000_ab12/
  render_studio_turntable_run_20260122_170000_ab12.mp4 --profile strict
  micromamba run -n fashion_video_env fashion export --input realism/outputs/run_20260122_170000_ab12/enhanced_strict_run_20260122_170000_ab12.mp4 --preset
  social_9x16
  echo "DEMO COMPLETE"

  - Verification note: This enforces execution inside a named micromamba environment boundary.

  10. Logging/runtime monitoring example

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: cli/core/logging.py:1
  - Code:

  """Structured CLI logging."""

  from datetime import datetime


  def log(msg: str) -> None:
      ts = datetime.utcnow().isoformat() + "Z"
      print(f"[FVP {ts}] {msg}")

  - Verification note: This emits structured timestamped runtime log lines.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: cli/core/paths.py:1
  - Code:

  """Path helpers."""

  from pathlib import Path
  import os

  DEFAULT_ROOT = Path("/home/dom/fashion_video_pipeline")


  def root() -> Path:
      return Path(os.environ.get("FVP_ROOT", str(DEFAULT_ROOT)))


  def run_id() -> str:
      rid = os.environ.get("FVP_RUN_ID", "")
      if not rid:
          raise RuntimeError("FVP_RUN_ID is required")
      return rid


  def run_dir(kind: str) -> Path:
      p = root() / kind / run_id()
      p.mkdir(parents=True, exist_ok=True)
      return p

  - Verification note: This enforces run identifiers and creates run-scoped output directories.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: cli/commands/enhance_video.py:1
  - Code:

  """Enhance video.

  Attempts Hummingbird-XT first, then deterministic ffmpeg fallback.
  """

  from pathlib import Path
  import typer
  from cli.core.config import load_profile
  from cli.core.paths import run_dir, run_id
  from cli.core.ai_ops import run_hummingbird_xt, run_ffmpeg_fallback


  def run(input: str = typer.Option(..., "--input"), profile: str = typer.Option("strict", "--profile"), force_fallback: str = typer.Option("", "--force-
  fallback")) -> None:
      cfg = load_profile(profile)
      out_dir = run_dir("realism/outputs")
      out_dir.mkdir(parents=True, exist_ok=True)
      out_path = out_dir / f"enhanced_{profile}_run_{run_id()}.mp4"

      if force_fallback == "ffmpeg_grade":
          # Fallback used when Hummingbird deps or weights are not compatible.
          run_ffmpeg_fallback(input, str(out_path))
          print("Enhancement complete")
          return

      try:
          run_hummingbird_xt(input, str(out_path), cfg["num_inference_steps"], cfg["diffusion_strength"])
      except Exception:
          # Strict fallback preserves geometry when Hummingbird fails.
          run_ffmpeg_fallback(input, str(out_path))
      print("Enhancement complete")

  - Verification note: This embeds run-id in output artifact names and routes runtime behavior through fallback hooks.