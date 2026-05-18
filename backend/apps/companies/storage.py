import os
import uuid

import boto3
from botocore.client import Config
from django.conf import settings
from PIL import Image, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

MAX_LOGO_SIZE_BYTES = 15 * 1024 * 1024
MAX_LOGO_WIDTH = 2400
MAX_LOGO_HEIGHT = 2400
ALLOWED_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
}


def _r2_config():
    config = settings.R2_STORAGE
    required_keys = ("ACCESS_KEY_ID", "SECRET_ACCESS_KEY", "BUCKET_NAME", "ENDPOINT_URL")
    missing = [key for key in required_keys if not config.get(key)]
    if missing:
        raise ValidationError({"detail": f"R2 storage is missing configuration: {', '.join(missing)}"})
    return config


def r2_client():
    config = _r2_config()
    return boto3.client(
        "s3",
        endpoint_url=config["ENDPOINT_URL"],
        aws_access_key_id=config["ACCESS_KEY_ID"],
        aws_secret_access_key=config["SECRET_ACCESS_KEY"],
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def validate_logo_file(file_obj):
    if file_obj.size > MAX_LOGO_SIZE_BYTES:
        raise ValidationError({"detail": "Logo must be 15MB or smaller."})

    content_type = getattr(file_obj, "content_type", "")
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValidationError({"detail": "Logo must be a PNG, JPG, or WEBP image."})

    try:
        image = Image.open(file_obj)
        width, height = image.size
    except UnidentifiedImageError as error:
        raise ValidationError({"detail": "Uploaded file is not a valid image."}) from error
    finally:
        file_obj.seek(0)

    if width > MAX_LOGO_WIDTH or height > MAX_LOGO_HEIGHT:
        raise ValidationError(
            {"detail": f"Logo dimensions must be at most {MAX_LOGO_WIDTH}px by {MAX_LOGO_HEIGHT}px."}
        )


def upload_company_logo(*, file_obj, company_id):
    config = _r2_config()
    client = r2_client()
    validate_logo_file(file_obj)
    extension = os.path.splitext(getattr(file_obj, "name", ""))[1].lower() or ".bin"
    object_key = f"company-logos/{company_id}/{uuid.uuid4().hex}{extension}"

    client.upload_fileobj(
        file_obj,
        config["BUCKET_NAME"],
        object_key,
        ExtraArgs={
            "ContentType": getattr(file_obj, "content_type", "application/octet-stream"),
        },
    )
    return object_key


def delete_object(object_key):
    if not object_key:
        return

    config = _r2_config()
    client = r2_client()
    client.delete_object(Bucket=config["BUCKET_NAME"], Key=object_key)


def signed_logo_url(object_key, expires_in=3600):
    if not object_key:
        return ""

    config = _r2_config()
    client = r2_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": config["BUCKET_NAME"], "Key": object_key},
        ExpiresIn=expires_in,
    )
