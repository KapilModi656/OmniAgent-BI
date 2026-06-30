import logging
import sys
import os

logger = logging.getLogger("MultiAgentBuilder")
logger.setLevel(logging.INFO) # Aap isko logging.DEBUG bhi kar sakte hain deep tracking ke liye

formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')


console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(formatter)

file_path = "logs/system_logs.log"


os.makedirs(os.path.dirname(file_path), exist_ok=True)

file_handler = logging.FileHandler(file_path, encoding='utf-8')
file_handler.setFormatter(formatter)


if not logger.hasHandlers():
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)