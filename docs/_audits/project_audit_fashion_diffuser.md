• Full Dependency Map

  1. Root project manifest
     pyproject.toml:1

  - Package: fashion_video_pipeline==0.1.0
  - Python: >=3.10
  - Console entrypoint: fashion = cli.main:app
  - No declared install dependencies in root manifest.
  - requirements.lock exists but is empty (requirements.lock size 0).

  2. First-party runtime actually present in local env (observed)

  - Environment interpreter: Python 3.10.19 (.micromamba/envs/fashion_video_env).
  - Installed packages count: 194 (pip freeze).
  - Key first-party-required libs observed installed: typer, torch==2.6.0+rocm6.4.2, segment_anything, Pillow, numpy, PyYAML, scikit-image, ffmpeg-python.
  - Editable install present: -e /home/dom/fashion_video_pipeline.

  3. Third-party manifests in repo
     third_party/dci_vton/environment.yaml:11

  - Conda: python=3.8.5, cudatoolkit=11.3, pytorch=1.11.0, torchvision=0.12.0, numpy=1.19.2
  - Pip extras include: diffusers, transformers==4.19.2, pytorch-lightning==1.4.2, kornia==0.6, opencv-python==4.1.2.30, editable taming-transformers,
    editable CLIP.

  third_party/taming_transformers/environment.yaml:42

  - Conda: python=3.8.5, cudatoolkit=10.2, pytorch=1.7.0, torchvision=0.8.1, numpy=1.19.2
  - Pip includes: transformers==4.3.1, pytorch-lightning==1.0.8, einops==0.3.0, editable local package.

  third_party/hummingbird_xt/requirements.txt:67

  - Very large pinned set (hundreds), including: torch ROCm wheel, torchaudio, torchvision, diffusers==0.35.0, transformers==4.55.0, accelerate==1.9.0,
    onnx, onnxruntime, fastapi, gradio, flash_attn, ROCm/AMD-specific packages (amdsmi, hip-python, hipify_torch).

  third_party/kohya_ss/pyproject.toml:380

  - Core deps include: diffusers[torch]==0.32.2, transformers==4.44.2, accelerate>=1.7.0, xformers>=0.0.30, onnxruntime-gpu==1.19.2, bitsandbytes>=0.45.0,
    gradio>=5.34.1, torch>=2.5.0, torchvision>=0.20.0.

  third_party/kohya_ss/requirements_linux_rocm.txt:1

  - ROCm variant pins: torch==2.7.1+rocm6.3, torchvision==0.22.1+rocm6.3, onnxruntime-rocm==1.21.0, tensorflow-rocm.

  third_party/kohya_ss/requirements_linux.txt

  - CUDA variant pins: torch==2.7.0+cu128, torchvision==0.22.0+cu128, onnxruntime-gpu==1.19.2, bitsandbytes.

  third_party/realesrgan/requirements.txt:364

  - basicsr>=1.4.2, facexlib>=0.2.5, gfpgan>=1.3.5, numpy, opencv-python, Pillow, torch>=1.7, torchvision, tqdm.

  third_party/rife/requirements.txt:373

  - numpy<=1.23.5, tqdm, sk-video, torch>=1.6.0, opencv-python>=4.1.2, moviepy>=1.0.3, torchvision>=0.7.0.

  4. No Node dependency graph

  - No package.json, package-lock.json, pnpm-lock.yaml, or yarn.lock found.

  ———

  Runtime Stack

  1. Python

  - System: Python 3.10.12
  - Project env: Python 3.10.19
  - Root requirement: >=3.10 (pyproject.toml:4).

  2. CLI framework

  - typer app entrypoint (cli/main.py:17 and pyproject.toml:7).

  3. Torch backend

  - Doctor hard-check: torch.__version__.startswith("2.6.0+rocm6.4.2") (cli/commands/doctor.py:18).
  - Active env freeze confirms ROCm wheel URLs for torch/torchvision/torchaudio.

  4. ffmpeg/ffprobe

  - Required by first-party pipeline (cli/commands/doctor.py:28, cli/core/video_ops.py:166, cli/core/validators.py:18).
  - Installed in host runtime observed: ffmpeg 4.4.2, ffprobe 4.4.2.

  5. Blender

  - Pinned binary path: blender/project_template/tools/blender-3.6.23-linux-x64/blender (cli/core/blender_ops.py:6).
  - Observed binary version: Blender 3.6.23.

  6. Conda/micromamba usage

  - Demo script executes everything under micromamba run -n fashion_video_env ... (scripts/run_demo.sh:105).

  ———

  Model Frameworks Used

  1. First-party invoked frameworks

  - segment_anything for mask generation (cli/commands/prepare_assets.py:48).
  - torch for GPU detection/ops (cli/commands/prepare_assets.py:47, cli/core/gpu.py:155).
  - DCI-VTON inference via subprocess to third_party/dci_vton/test.py (cli/core/ai_ops.py:63).
  - Hummingbird-XT inference via subprocess to third_party/hummingbird_xt/infer/examples/wan2.2/predict_ti2v_single.py (cli/core/ai_ops.py:85).
  - Kohya sd-scripts for identity training and still generation (cli/commands/train_identity.py:154, cli/commands/generate_still.py:115).

  2. Third-party model stacks present

  - Diffusion stack (Diffusers/Transformers/CLIP) in DCI-VTON and Hummingbird/Kohya manifests.
  - ESRGAN stack in third_party/realesrgan.
  - RIFE interpolation stack in third_party/rife.
  - Taming Transformers repo vendored.

  ———

  GPU Usage Configuration (CUDA / ROCm / CPU Fallback)

  1. First-party GPU assumptions

  - WSL GPU device required: /dev/dxg check (cli/commands/doctor.py:14).
  - ROCm version string hard-pinned (cli/commands/doctor.py:18).
  - SAM mask generation has CPU fallback:
    sam.to(device="cuda" if torch.cuda.is_available() else "cpu") (cli/commands/prepare_assets.py:55).

  2. DCI-VTON invocation

  - Wrapper always passes --gpu_id 0 (cli/core/ai_ops.py:64).
  - DCI script sets CUDA device unconditionally after device selection:
    torch.cuda.set_device(device) (third_party/dci_vton/test.py:263).
  - Result: CPU-only environments can still fail even though it computes device=cpu.

  3. Hummingbird

  - Native script examples use ROCm GPU pinning via ROCR_VISIBLE_DEVICES=0 (third_party/hummingbird_xt/infer/run_i2v.sh:3).
  - First-party wrapper does not set ROCR_VISIBLE_DEVICES and uses incompatible CLI args (see failure points).

  4. Kohya container path

  - Container config is CUDA/NVIDIA-oriented (third_party/kohya_ss/Dockerfile:17, third_party/kohya_ss/docker-compose.yaml:42), not ROCm.

  ———

  Environment Variable Usage

  1. FVP_RUN_ID

  - Required by core pathing (cli/core/paths.py:143).
  - Used by demo runner (scripts/run_demo.sh:3) and blender output naming (blender/scripts/render_headless.py:71).

  2. FVP_ROOT

  - Optional override of repo root (cli/core/paths.py:139), defaults to /home/dom/fashion_video_pipeline.

  3. TENSORBOARD_PORT

  - Defined in .env (third_party/kohya_ss/.env:1).
  - Consumed by compose for tensorboard and GUI env injection (third_party/kohya_ss/docker-compose.yaml:18, third_party/kohya_ss/docker-compose.yaml:49).

  4. Docker NVIDIA/CUDA envs (Kohya)

  - NVIDIA_VISIBLE_DEVICES, NVIDIA_DRIVER_CAPABILITIES, CUDA_VERSION, NVIDIA_REQUIRE_CUDA, CUDA_HOME, LD_LIBRARY_PATH, PYTHONPATH (third_party/kohya_ss/
    Dockerfile:17, third_party/kohya_ss/Dockerfile:39, third_party/kohya_ss/Dockerfile:141).

  5. ROCm env in scripts

  - ROCR_VISIBLE_DEVICES used by Hummingbird infer shell wrappers (third_party/hummingbird_xt/infer/run_i2v.sh:3).

  ———

  Containerization Setup

  1. Top-level repo

  - No root Dockerfile or root compose for the full pipeline.

  2. Kohya submodule
     third_party/kohya_ss/docker-compose.yaml

  - Services: kohya-ss-gui, tensorboard.
  - Ports:
      - 7860:7860 GUI.
      - ${TENSORBOARD_PORT:-6006}:6006 tensorboard.
  - Volumes include dataset/models/cache mounts:
      - ./models:/app/models
      - ./dataset:/dataset
      - ./dataset/logs:/app/logs
      - ./dataset/outputs:/app/outputs
      - multiple cache mounts under ./.cache/*.
  - GPU reservation in compose:
      - driver: nvidia, capabilities: [gpu], device_ids: ["all"].
  - Uses tmpfs: /tmp.

  third_party/kohya_ss/Dockerfile

  - Multi-stage build on python:3.11-slim-bookworm.
  - Installs partial CUDA toolkit (cuda-nvcc-12-8).
  - Uses uv for dependency sync.
  - Exposes 7860.
  - Entrypoint launches python3 kohya_gui.py --listen 0.0.0.0 --server_port 7860.

  3. RIFE submodule
     third_party/rife/docker/Dockerfile

  - Base: python:3.8-slim.
  - Installs bash ffmpeg.
  - Copies full RIFE repo and installs requirements.txt.
  - Adds wrapper scripts inference_img and inference_video.
  - No EXPOSE; entrypoint /bin/bash.
  - Sets ENV NVIDIA_DRIVER_CAPABILITIES all.

  ———

  External APIs / Downloads Required

  1. Model/checkpoint artifacts required by first-party code

  - SAM checkpoint: tryon/masking/sam_vit_h_4b8939.pth (cli/commands/prepare_assets.py:54).
  - DCI-VTON checkpoint: tryon/engine/weights/viton512.ckpt (cli/core/ai_ops.py:68).
  - Identity base model: identity/base_models/sd_base.safetensors (cli/commands/train_identity.py:145, cli/commands/generate_still.py:106).

  2. External download pointers in vendored docs

  - DCI-VTON pretrained weights from Google Drive/Baidu (third_party/dci_vton/README.md:78).
  - DCI-VTON vgg/model checkpoints required (third_party/dci_vton/README.md:39, third_party/dci_vton/README.md:118).
  - Hummingbird model weights via Hugging Face (third_party/hummingbird_xt/README.md:377).
  - RealESRGAN pretrained weights via GitHub releases (third_party/realesrgan/README.md:199, third_party/realesrgan/README.md:202).
  - RIFE pretrained and dataset downloads in README (third_party/rife/README.md:133).

  3. Potential network-touching libs present in active env

  - huggingface-hub, gdown, wandb, datasets, kagglehub (from active pip freeze), implying possible outbound access depending on invoked scripts.

  ———

  Installation Steps on a Fresh Linux Machine

  1. Install base OS packages:

  - python3.10, pip, ffmpeg, GPU drivers (ROCm stack if following current doctor constraint), and WSL GPU stack only if targeting same /dev/dxg assumptions.

  2. Create environment:

  - micromamba create -n fashion_video_env python=3.10 pip=23.3.2
  - activate and install project editable package:
      - pip install -e /home/dom/fashion_video_pipeline

  3. Install runtime Python deps used by first-party commands (minimum):

  - typer, torch (ROCm version matching doctor), Pillow, numpy, PyYAML, segment_anything, scikit-image.

  4. Ensure subprocess toolchains are installable/invokable:

  - DCI-VTON dependencies (third_party/dci_vton/environment.yaml stack or equivalent pip environment).
  - Kohya sd-scripts dependencies if using identity training/generation.
  - Hummingbird requirements if using enhance-video AI path.

  5. Place required model files:

  - tryon/masking/sam_vit_h_4b8939.pth
  - tryon/engine/weights/viton512.ckpt (+ optional viton512_v2.ckpt, warp_viton.pth)
  - identity/base_models/sd_base.safetensors
  - Hummingbird model tree expected by invoked script.

  6. Set required env vars:

  - FVP_RUN_ID required.
  - Optional FVP_ROOT if repo path differs from default.

  7. Run verification:

  - fashion doctor
  - Then execute the sequence in scripts/run_demo.sh.

  ———

  Common Failure Points

  1. Hummingbird wrapper argument mismatch

  - Wrapper passes --input_video, --output_video, --steps, --strength (cli/core/ai_ops.py:86).
  - Target script parser does not define those args; it defines --outdir, --infer_steps, --valid_image_path, prompt files (third_party/hummingbird_xt/infer/
    examples/wan2.2/predict_ti2v_single.py:47).
  - This causes subprocess failure and fallback path activation.

  2. DCI-VTON CPU path is not safe

  - Code chooses CPU when CUDA unavailable, but still calls torch.cuda.set_device(device) (third_party/dci_vton/test.py:262 and third_party/dci_vton/
    test.py:263).
  - Likely failure on non-CUDA/ROCm torch builds.

  3. Doctor is environment-fragile

  - Hard version check for exact torch string (cli/commands/doctor.py:18).
  - Any patch/minor mismatch fails even if runtime is functional.

  4. WSL-specific gate

  - /dev/dxg required (cli/commands/doctor.py:14).
  - Native Linux without WSL GPU paravirt fails doctor immediately.

  5. Mandatory run ID

  - Missing FVP_RUN_ID raises runtime error (cli/core/paths.py:145).

  6. Identity path prerequisites currently absent

  - identity/base_models currently empty; training/still commands will fail (cli/commands/train_identity.py:146, cli/commands/generate_still.py:106).
  - identity/datasets exists but no prepared identity dataset tree.

  7. Hummingbird model path expectations vs repo layout

  - Script defaults expect model structure under third_party/hummingbird_xt/.../models.
  - Large Hummingbird weights are in realism/hummingbird/weights, not directly wired by wrapper.

  8. Toolchain mismatch across subprojects

  - DCI/Taming manifests are CUDA-centric old stacks.
  - First-party doctor expects ROCm torch.
  - Kohya docker stack is NVIDIA CUDA.
  - Cross-using these without isolated envs is high-risk.

  9. Output filename assumptions

  - apply-garment expects DCI output at out_dir/result/000001_00.png (cli/core/ai_ops.py:78).
  - Any upstream naming change breaks rename step.

  ———

  Execution Flow (Input → Processing → Output)

  1. Entry command graph is registered in cli/main.py:26.
  2. Demo sequence (scripts/run_demo.sh:105):

  - fashion doctor
  - fashion prepare-assets
  - fashion apply-garment
  - fashion render-scene
  - fashion enhance-video
  - fashion export

  3. Asset preparation
     cli/commands/prepare_assets.py:67

  - Reads:
      - assets/humans/input/human.jpg
      - assets/garments/input/hoodie_front.png
      - assets/garments/input/hoodie_back.png
  - Resizes to 512x512 PNG.
  - Runs SAM on garment and human images.
  - Writes:
      - prepared images under assets/*/prepared
      - masks under assets/masks/garments and assets/masks/humans.

  4. Try-on application
     cli/commands/apply_tryon.py:51 + cli/core/ai_ops.py:13

  - Builds minimal VITON-like dataroot under tryon/engine/dci_vton_data/test/....
  - Synthesizes parse maps and dummy OpenPose JSON.
  - Calls DCI-VTON test.py.
  - Writes result to tryon/outputs/<run_id>/tryon_human_run_<run_id>.png.

  5. Scene render
     cli/commands/render_blender.py:70 + cli/core/blender_ops.py:9 + blender/scripts/render_headless.py:48

  - Launches pinned Blender binary headless.
  - Loads template .blend.
  - Applies garment texture.
  - Renders mp4 to blender/renders/<run_id>/render_<scene>_run_<run_id>.mp4.

  6. Enhancement
     cli/commands/enhance_video.py:112

  - Attempts Hummingbird subprocess first.
  - On any exception (or explicit --force-fallback ffmpeg_grade), runs deterministic ffmpeg grade filter.
  - Writes realism/outputs/<run_id>/enhanced_<profile>_run_<run_id>.mp4.

  7. Export/transcode
     cli/commands/export.py:85 + presets in finishing/exports/presets/*.yaml

  - Scales/fps transcodes via ffmpeg.
  - Writes final finishing/exports/<run_id>/export_<preset>_run_<run_id>.mp4.